// Bài kiểm tra pin laptop: đo tốc độ xả pin thật (Battery API) và tính % chai từ
// dung lượng thiết kế so với dung lượng đầy hiện tại do người dùng nhập từ báo cáo
// pin của hệ điều hành. Trình duyệt không đọc được mWh nên phần chai phải nhập tay;
// phần xả pin đo trực tiếp. Mọi phép tính chạy trên máy, không gọi API ngoài.
import './battery.css';
import {
  classifyHealth,
  computeHealth,
  fmtClock,
  fmtHours,
  fmtNum,
  fmtPct,
  type HealthClass,
} from './capacity';
import {
  clearSession,
  computeDrainStats,
  createMockBatterySource,
  createRealBatterySource,
  detectAnomalies,
  loadSession,
  parseLocalInputValue,
  saveSession,
  toLocalInputValue,
  type AnomalyKey,
  type BatterySample,
  type BatterySource,
  type StoredCapacity,
} from './drain';

/** Khoảng cách lấy mẫu mặc định: 30 giây (sự kiện levelchange sẽ lấy mẫu sớm hơn). */
const SAMPLE_MS = 30_000;
/** Pin đứng yên quá 30 phút dù đang chạy tải nặng → đánh dấu bất thường. */
const STALL_MS = 30 * 60_000;
/** Phiên lưu quá 24 giờ thì không gợi ý tiếp tục nữa. */
const RESUME_MAX_AGE_MS = 24 * 60 * 60_000;
/** Chế độ kiểm thử `?mock=1`: pin giả tụt 1% mỗi 8 giây. */
const MOCK = new URLSearchParams(window.location.search).has('mock');

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mkButton(label: string): HTMLButtonElement {
  const btn = el('button', 'btn btn--ghost', label);
  btn.type = 'button';
  return btn;
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function readNum(input: HTMLInputElement): number | null {
  const raw = input.value.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Số phần trăm hợp lệ 0–100 (mức pin, mức đích, mức máy tắt). */
function readPct(input: HTMLInputElement): number | null {
  const n = readNum(input);
  return n !== null && n >= 0 && n <= 100 ? n : null;
}

const ANOMALY_LABELS: Record<Exclude<AnomalyKey, 'shutdown'>, string> = {
  recharge: 'Pin có lúc tăng hoặc đang cắm sạc trong phiên đo — đoạn đó không được tính vào tốc độ xả.',
  fastdrop: 'Mức pin tụt ≥5% trong chưa tới 2 phút — dấu hiệu “pin ảo” hoặc pin đã xuống rất yếu.',
  stall: 'Mức pin đứng yên hơn 30 phút dù máy đang chạy tải nặng — pin hoặc bộ đo pin có vấn đề.',
};

export function mountBattery(container: HTMLElement): () => void {
  const root = el('div', 'bat');
  let disposed = false;

  // ---- Trạng thái ----
  let source: BatterySource | null = null;
  let detachSource: (() => void) | null = null;
  let sampleTimer: number | null = null;
  let tickTimer: number | null = null;
  let session: { samples: BatterySample[]; running: boolean } | null = null;
  let manualSamples: BatterySample[] = [];
  let manualMode = false;
  let resumeAvailable = false;
  let stallFlagged = false;
  let lastLevelChangeAt = 0;
  let wakeLock: WakeLockSentinelLike | null = null;
  let wakeLockDenied = false;
  let workers: Worker[] = [];

  // ---- Giới thiệu + thông báo ----
  const intro = el(
    'p',
    'bat__intro',
    'Bài này làm hai việc: đo tốc độ máy xả pin thật (chỉ Chrome/Edge đọc được pin), và tính phần trăm chai từ hai con số trong báo cáo pin của hệ điều hành — dung lượng thiết kế và dung lượng đầy hiện tại. Trình duyệt không đọc được mWh nên hai con số đó bạn tự nhập; mọi phép tính chạy trên máy của bạn.',
  );

  const noticeEl = el('div', 'bat__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  // ================= Khối 1: dung lượng =================
  const capSection = el('section', 'bat__section');
  capSection.append(el('h3', 'bat__title', 'Dung lượng pin (tính % chai)'));
  capSection.append(
    el(
      'p',
      'bat__desc',
      'Nhập hai dung lượng đọc được từ báo cáo pin của hệ điều hành; chỉ cần cùng đơn vị (Wh hoặc mAh). Bỏ trống nếu chỉ muốn đo xả pin.',
    ),
  );

  const capHint = el('details', 'bat__details');
  const capHintSummary = el('summary', undefined, 'Lấy hai con số này ở đâu?');
  capHint.append(
    capHintSummary,
    el(
      'p',
      'bat__details-body',
      'Windows: chạy “powercfg /batteryreport” rồi mở file báo cáo, xem DESIGN CAPACITY và FULL CHARGE CAPACITY. macOS: System Information → Power, xem Full Charge Capacity. Linux: chạy “upower -i $(upower -e | grep BAT)”, xem energy-full-design và energy-full.',
    ),
  );

  const capFields = el('div', 'bat__fields');
  const addField = (
    parent: HTMLElement,
    label: string,
    attrs: { min?: string; max?: string; step?: string; placeholder?: string },
  ): HTMLInputElement => {
    const wrap = el('label', 'bat__field');
    wrap.append(el('span', 'bat__field-label', label));
    const input = el('input', 'bat__input');
    input.type = 'number';
    input.inputMode = 'decimal';
    if (attrs.min !== undefined) input.min = attrs.min;
    if (attrs.max !== undefined) input.max = attrs.max;
    if (attrs.step !== undefined) input.step = attrs.step;
    if (attrs.placeholder !== undefined) input.placeholder = attrs.placeholder;
    wrap.append(input);
    parent.append(wrap);
    return input;
  };

  const capDesign = addField(capFields, 'Dung lượng thiết kế', { min: '1', step: 'any', placeholder: 'Ví dụ 5000' });
  const capFull = addField(capFields, 'Dung lượng đầy hiện tại', { min: '1', step: 'any', placeholder: 'Ví dụ 4100' });
  const capUnitWrap = el('label', 'bat__field');
  capUnitWrap.append(el('span', 'bat__field-label', 'Đơn vị'));
  const capUnit = el('select', 'bat__input bat__select');
  const optWh = el('option', undefined, 'Wh');
  optWh.value = 'wh';
  const optMah = el('option', undefined, 'mAh');
  optMah.value = 'mah';
  capUnit.append(optWh, optMah);
  capUnitWrap.append(capUnit);
  capFields.append(capUnitWrap);
  const capCycles = addField(capFields, 'Số chu kỳ sạc (tuỳ chọn)', { min: '0', step: '1', placeholder: '—' });

  // Vòng tròn sức khoẻ pin + nhãn kết luận
  const capResult = el('div', 'bat__cap-result');
  const RING_R = 54;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringSvg = svgEl('svg', { viewBox: '0 0 140 140', class: 'bat__ring', 'aria-hidden': 'true' });
  ringSvg.append(
    svgEl('circle', { cx: 70, cy: 70, r: RING_R, class: 'bat__ring-track' }),
    svgEl('circle', {
      cx: 70,
      cy: 70,
      r: RING_R,
      class: 'bat__ring-value',
      'stroke-dasharray': RING_CIRC,
      'stroke-dashoffset': RING_CIRC,
      transform: 'rotate(-90 70 70)',
    }),
  );
  const ringText = svgEl('text', { x: 70, y: 66, class: 'bat__ring-num', 'text-anchor': 'middle' },);
  ringText.textContent = '—';
  const ringCap = svgEl('text', { x: 70, y: 86, class: 'bat__ring-cap', 'text-anchor': 'middle' });
  ringCap.textContent = 'sức khoẻ';
  ringSvg.append(ringText, ringCap);

  const verdictPill = el('p', 'bat__verdict', 'Nhập hai dung lượng để biết pin chai bao nhiêu %.');
  capResult.append(ringSvg, verdictPill);

  capSection.append(capHint, capFields, capResult);

  // ================= Khối 2: đo xả pin =================
  const drainSection = el('section', 'bat__section');
  drainSection.append(el('h3', 'bat__title', 'Đo xả pin thực tế'));
  drainSection.append(
    el(
      'p',
      'bat__desc',
      'Rút sạc rồi bấm bắt đầu. Trang tự lấy mẫu mỗi 30 giây, tạm dừng khi bạn cắm sạc, và tiếp tục được sau khi tab ngủ. Số quan trọng nhất là %/giờ: chia mức pin đã xả cho thời gian xả thật.',
    ),
  );

  const drainStatus = el('p', 'bat__status', 'Chưa bắt đầu đo.');

  const drainActions = el('div', 'bat__actions');
  const btnStart = mkButton('Bắt đầu đo xả');
  const btnStop = mkButton('Dừng');
  btnStop.disabled = true;
  const btnManualToggle = mkButton('Chế độ nhập tay');
  const loadWrap = el('label', 'bat__field bat__field--inline');
  loadWrap.append(el('span', 'bat__field-label', 'Tải thêm'));
  const loadSelect = el('select', 'bat__input bat__select');
  for (const [value, label] of [
    ['off', 'Tắt (chỉ xả tự nhiên)'],
    ['mid', 'Vừa (nửa số luồng CPU)'],
    ['max', 'Tối đa (toàn bộ CPU)'],
  ] as const) {
    const opt = el('option', undefined, label);
    opt.value = value;
    loadSelect.append(opt);
  }
  loadWrap.append(loadSelect);
  const targetWrap = el('label', 'bat__field bat__field--inline');
  targetWrap.append(el('span', 'bat__field-label', 'Mức đích %'));
  const targetInput = el('input', 'bat__input bat__input--small');
  targetInput.type = 'number';
  targetInput.min = '1';
  targetInput.max = '99';
  targetInput.step = '1';
  targetInput.value = '20';
  targetWrap.append(targetInput);
  drainActions.append(btnStart, btnStop, btnManualToggle, loadWrap, targetWrap);

  const drainGrid = el('div', 'bat__grid');
  const addRow = (label: string): HTMLElement => {
    const row = el('div', 'bat__row');
    row.append(el('span', 'bat__row-label', label), el('span', 'bat__row-value', '—'));
    drainGrid.append(row);
    return row.lastElementChild as HTMLElement;
  };
  const rowLevel = addRow('Mức pin hiện tại');
  const rowDrained = addRow('Đã xả');
  const rowElapsed = addRow('Thời gian xả thật');
  const rowRate = addRow('Tốc độ xả');
  const rowRemain = addRow('Còn lại');
  const rowTotal = addRow('Tổng thời lượng');
  const rowPower = addRow('Công suất TB');
  const rowEta = addRow('Đến mức đích');

  const powerHint = el('p', 'bat__hint', 'Công suất W chỉ tính được khi đơn vị là Wh.');
  powerHint.hidden = true;

  // Biểu đồ mức pin theo thời gian
  const chartSvg = svgEl('svg', {
    viewBox: '0 0 320 150',
    class: 'bat__chart',
    role: 'img',
    'aria-label': 'Biểu đồ mức pin giảm dần theo thời gian',
  });
  const chartLabelTop = svgEl('text', { x: 8, y: 14, class: 'bat__chart-label' });
  chartLabelTop.textContent = '100%';
  const chartLabelBottom = svgEl('text', { x: 8, y: 147, class: 'bat__chart-label' });
  chartLabelBottom.textContent = '0%';
  const chartLine = svgEl('polyline', { class: 'bat__chart-line', points: '' });
  chartSvg.append(chartLabelTop, chartLabelBottom, chartLine);
  const chartWrap = el('div', 'bat__chart-wrap');
  chartWrap.hidden = true;
  chartWrap.append(chartSvg);

  const tableDetails = el('details', 'bat__details');
  tableDetails.hidden = true;
  tableDetails.append(el('summary', undefined, 'Bảng số liệu từng mẫu'));
  const tableWrap = el('div', 'bat__details-body');
  tableDetails.append(tableWrap);

  // Chế độ nhập tay (Firefox/Safari hoặc muốn tính từ số liệu cũ)
  const manualWrap = el('div', 'bat__manual');
  manualWrap.hidden = true;
  manualWrap.append(
    el(
      'p',
      'bat__desc',
      'Nhập hai mốc bạn tự ghi: mức pin và thời điểm lúc bắt đầu, rồi lúc kết thúc. Trang sẽ tính tốc độ xả từ hai mốc đó.',
    ),
  );
  const manualFields = el('div', 'bat__fields');
  const manualStartLevel = addField(manualFields, 'Mức pin lúc bắt đầu %', { min: '0', max: '100', step: '1', placeholder: 'Ví dụ 95' });
  const manualEndLevel = addField(manualFields, 'Mức pin lúc kết thúc %', { min: '0', max: '100', step: '1', placeholder: 'Ví dụ 40' });
  const manualStartField = el('label', 'bat__field');
  manualStartField.append(el('span', 'bat__field-label', 'Thời điểm bắt đầu'));
  const manualStartTime = el('input', 'bat__input');
  manualStartTime.type = 'datetime-local';
  manualStartField.append(manualStartTime);
  manualFields.append(manualStartField);
  const manualEndField = el('label', 'bat__field');
  manualEndField.append(el('span', 'bat__field-label', 'Thời điểm kết thúc'));
  const manualEndTime = el('input', 'bat__input');
  manualEndTime.type = 'datetime-local';
  manualEndField.append(manualEndTime);
  manualFields.append(manualEndField);
  const btnManualCompute = mkButton('Tính tốc độ từ hai mốc');
  manualWrap.append(manualFields, btnManualCompute);

  drainSection.append(drainStatus, drainActions, drainGrid, powerHint, chartWrap, tableDetails, manualWrap);

  // ================= Khối 3: kết luận =================
  const finalSection = el('section', 'bat__section');
  finalSection.append(el('h3', 'bat__title', 'Kết luận'));

  const finalPill = el('p', 'bat__verdict bat__verdict--big', 'Chưa đủ dữ liệu để kết luận.');
  const verdictNotes = el('ul', 'bat__notes');
  verdictNotes.hidden = true;
  const adviceList = el('ul', 'bat__advice');

  const shutdownField = el('label', 'bat__field');
  shutdownField.append(
    el('span', 'bat__field-label', 'Máy tự tắt ở mức pin nào? (để trống nếu không tắt)'),
  );
  const shutdownInput = el('input', 'bat__input bat__input--small');
  shutdownInput.type = 'number';
  shutdownInput.min = '0';
  shutdownInput.max = '100';
  shutdownInput.step = '1';
  shutdownField.append(shutdownInput);

  const finalActions = el('div', 'bat__actions');
  const btnCopy = mkButton('Sao chép kết quả');
  const btnDownload = mkButton('Tải file .txt');
  const btnReset = mkButton('Xoá kết quả');
  finalActions.append(btnCopy, btnDownload, btnReset);

  finalSection.append(finalPill, verdictNotes, adviceList, shutdownField, finalActions);

  root.append(intro, noticeEl, capSection, drainSection, finalSection);
  container.append(root);

  // ================= Đọc trạng thái =================
  function readCapacityInputs(): { design: number | null; full: number | null; cycles: number | null; unit: 'wh' | 'mah' } {
    return {
      design: readNum(capDesign),
      full: readNum(capFull),
      cycles: readNum(capCycles),
      unit: capUnit.value === 'mah' ? 'mah' : 'wh',
    };
  }

  function readCapacityRaw(): StoredCapacity {
    return {
      design: capDesign.value,
      full: capFull.value,
      unit: capUnit.value === 'mah' ? 'mah' : 'wh',
      cycles: capCycles.value,
    };
  }

  function fillCapacityInputs(cap: StoredCapacity): void {
    capDesign.value = cap.design;
    capFull.value = cap.full;
    capUnit.value = cap.unit;
    capCycles.value = cap.cycles;
  }

  function currentSamples(): BatterySample[] {
    return manualMode ? manualSamples : (session?.samples ?? []);
  }

  function fullWh(): number | null {
    const { full, unit } = readCapacityInputs();
    return unit === 'wh' && full !== null ? full : null;
  }

  function persist(status: 'active' | 'ended'): void {
    saveSession({
      v: 1,
      status,
      savedAt: Date.now(),
      samples: session?.samples ?? [],
      capacity: readCapacityRaw(),
    });
  }

  // ================= Render =================
  function renderCapacity(): void {
    const { design, full } = readCapacityInputs();
    if (design === null || full === null || design <= 0) {
      ringText.textContent = '—';
      (ringSvg.querySelector('.bat__ring-value') as SVGElement).setAttribute(
        'stroke-dashoffset',
        String(RING_CIRC),
      );
      verdictPill.textContent = 'Nhập hai dung lượng để biết pin chai bao nhiêu %.';
      verdictPill.className = 'bat__verdict';
      return;
    }
    const res = computeHealth({ design, full });
    const v = classifyHealth(res.health);
    ringText.textContent = fmtPct(res.health);
    (ringSvg.querySelector('.bat__ring-value') as SVGElement).setAttribute(
      'stroke-dashoffset',
      String(RING_CIRC * (1 - res.health / 100)),
    );
    const suffix = res.overDesign
      ? ' — dung lượng đầy cao hơn thiết kế, kiểm tra lại số liệu (coi như pin còn tốt).'
      : ` — đã mất ${fmtNum(res.lost)} ${readCapacityInputs().unit === 'wh' ? 'Wh' : 'mAh'}.`;
    verdictPill.textContent = `${v.ok ? '✓' : '✕'} ${v.label} — chai ${fmtPct(res.wearPct)}${suffix}`;
    verdictPill.className = `bat__verdict ${v.ok ? 'bat__verdict--ok' : 'bat__verdict--bad'}`;
  }

  function renderChart(samples: BatterySample[]): void {
    if (samples.length < 2) {
      chartWrap.hidden = true;
      return;
    }
    const t0 = samples[0].t;
    const span = Math.max(1, samples[samples.length - 1].t - t0);
    const points = samples
      .map((s) => {
        const x = 8 + ((s.t - t0) / span) * 304;
        const y = 138 - (Math.max(0, Math.min(100, s.level)) / 100) * 126;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    chartLine.setAttribute('points', points);
    chartWrap.hidden = false;
  }

  function renderDrain(): void {
    if (disposed) return;
    const samples = currentSamples();
    const stats = computeDrainStats(samples, fullWh());
    const liveLevel = session?.running && source ? source.get().level : (samples[samples.length - 1]?.level ?? null);

    rowLevel.textContent = liveLevel === null ? '—' : `${fmtNum(liveLevel)}%`;
    rowDrained.textContent = stats.sampleCount >= 2 ? `${fmtNum(Math.max(0, stats.drainedPct))}%` : '—';
    rowElapsed.textContent = stats.sampleCount >= 2 ? fmtHours(stats.elapsedMs / 3_600_000) : '—';
    rowRate.textContent = stats.ratePctPerHour !== null ? `${fmtNum(stats.ratePctPerHour)}%/giờ` : 'chưa đủ 5 phút';
    rowRemain.textContent = fmtHours(stats.remainingHours);
    rowTotal.textContent = fmtHours(stats.totalHours);
    rowPower.textContent = stats.avgPowerW !== null ? `${fmtNum(stats.avgPowerW)} W` : '—';
    const target = readPct(targetInput);
    rowEta.textContent =
      stats.ratePctPerHour !== null && liveLevel !== null && target !== null
        ? liveLevel > target
          ? fmtHours((liveLevel - target) / stats.ratePctPerHour)
          : 'đã qua mức đích'
        : '—';

    powerHint.hidden = !(readCapacityInputs().unit === 'mah' && readCapacityInputs().full !== null);
    renderChart(samples);
    renderVerdict();
  }

  function collectAnomalies(): { key: AnomalyKey; label: string }[] {
    const keys = new Set<AnomalyKey>(detectAnomalies(currentSamples()));
    if (stallFlagged) keys.add('stall');
    const shutdown = readPct(shutdownInput);
    if (shutdown !== null && shutdown >= 5) keys.add('shutdown');
    return [...keys].map((key) => ({
      key,
      label:
        key === 'shutdown'
          ? `Máy tự tắt khi pin còn ${readPct(shutdownInput)}% — pin tụt đột ngột, dấu hiệu chai nặng hoặc “pin ảo”.`
          : ANOMALY_LABELS[key as Exclude<AnomalyKey, 'shutdown'>],
    }));
  }

  function adviceFor(cls: HealthClass | null): string[] {
    const common = [
      'Hiệu chuẩn để số đọc chính xác: sạc đầy 100%, dùng đến khi còn ~5% rồi sạc lại một mạch, làm mỗi 1–2 tháng.',
      'Số %/giờ phụ thuộc mạnh vào việc máy đang làm gì; muốn so sánh các lần đo thì giữ cùng mức tải và độ sáng màn hình.',
    ];
    switch (cls) {
      case 'good':
        return ['Pin còn tốt, không cần thay thế. Giữ thói quen sạc trong khoảng 20–80% nếu muốn kéo dài tuổi thọ pin.', ...common];
      case 'light':
        return ['Pin đã chai nhẹ nhưng vẫn dùng bình thường. Theo dõi thêm vài tháng; nếu thời lượng giảm nhanh hơn thì kiểm tra lại.', ...common];
      case 'clear':
        return ['Pin chai rõ rệt, thời lượng giảm đáng kể so với lúc mới. Cân nhắc thay pin khi thời lượng không đủ dùng; ưu tiên pin chính hãng.', ...common];
      case 'heavy':
        return ['Pin chai nặng hoặc có dấu hiệu “pin ảo”. Nên thay pin sớm để tránh máy tắt đột ngột giữa việc; ưu tiên pin chính hãng.', ...common];
      default:
        return ['Nhập dung lượng thiết kế và dung lượng đầy (khối “Dung lượng pin”) để kết luận được pin chai bao nhiêu phần trăm.', ...common];
    }
  }

  function renderVerdict(): void {
    if (disposed) return;
    const anomalies = collectAnomalies();
    const samples = currentSamples();
    const stats = computeDrainStats(samples, fullWh());
    const { design, full } = readCapacityInputs();
    const rate = stats.ratePctPerHour;
    const drained = stats.sampleCount >= 2 ? Math.max(0, stats.drainedPct) : null;

    let cls: HealthClass | null = null;
    let tone: 'ok' | 'bad' = 'ok';
    const lines: string[] = [];

    if (design !== null && full !== null && design > 0) {
      const res = computeHealth({ design, full });
      const v = classifyHealth(res.health);
      cls = v.cls;
      tone = v.ok ? 'ok' : 'bad';
      finalPill.textContent = `${v.ok ? '✓' : '✕'} ${v.label} — chai ${fmtPct(res.wearPct)} (sức khoẻ ${fmtPct(res.health)})`;
    } else if (rate !== null && drained !== null && drained >= 5) {
      finalPill.textContent = 'Chưa nhập dung lượng — chưa kết luận được % chai, nhưng đã có số đo xả pin.';
    } else {
      finalPill.textContent = 'Chưa đủ dữ liệu để kết luận.';
    }

    if (rate !== null) {
      lines.push(`Tốc độ xả đo được: ${fmtNum(rate)}%/giờ, tính trên ${fmtHours(stats.dischargingMs / 3_600_000)} không cắm sạc.`);
    } else if (samples.length >= 2) {
      lines.push('Đo thêm ít nhất 5 phút không cắm sạc để có tốc độ %/giờ tin cậy.');
    }
    if (anomalies.length > 0) {
      tone = 'bad';
      for (const a of anomalies) lines.push(`⚠ ${a.label}`);
    } else if (samples.length >= 2) {
      lines.push('Không phát hiện bất thường trong phiên đo.');
    }

    finalPill.className = `bat__verdict bat__verdict--big ${tone === 'ok' ? 'bat__verdict--ok' : 'bat__verdict--bad'}`;
    verdictNotes.replaceChildren(
      ...lines.map((text) => el('li', undefined, text)),
    );
    verdictNotes.hidden = lines.length === 0;
    adviceList.replaceChildren(
      ...adviceFor(cls).map((text) => {
        const li = el('li', undefined, text);
        return li;
      }),
    );
  }

  function buildSampleTable(): void {
    const samples = currentSamples();
    tableWrap.replaceChildren();
    if (samples.length < 2) {
      tableDetails.hidden = true;
      return;
    }
    tableDetails.hidden = false;
    const table = el('table', 'bat__table');
    const thead = el('thead');
    const headRow = el('tr');
    for (const label of ['Thời điểm', 'Mức pin', 'Trạng thái']) {
      headRow.append(el('th', undefined, label));
    }
    thead.append(headRow);
    const tbody = el('tbody');
    for (const s of samples.slice(-200)) {
      const tr = el('tr');
      tr.append(
        el('td', undefined, fmtClock(s.t)),
        el('td', undefined, `${fmtNum(s.level)}%`),
        el('td', undefined, s.charging ? 'đang sạc' : 'đang xả'),
      );
      tbody.append(tr);
    }
    table.append(thead, tbody);
    tableWrap.append(table);
  }

  // ================= Tải thêm (worker) =================
  function terminateLoad(): void {
    for (const w of workers) w.terminate();
    workers = [];
  }

  function applyLoad(): void {
    terminateLoad();
    if (!session?.running) return;
    const kind = loadSelect.value;
    if (kind === 'off') return;
    const cores = Math.max(1, Math.min(32, navigator.hardwareConcurrency || 4));
    const count = kind === 'max' ? cores : Math.max(1, Math.floor(cores / 2));
    for (let i = 0; i < count; i++) {
      const w = new Worker(new URL('./load-worker.ts', import.meta.url), { type: 'module' });
      w.postMessage({ ev: 'storm' });
      workers.push(w);
    }
    if (kind === 'max') notice('Đang chạy tải tối đa trên toàn bộ CPU — máy sẽ nóng và quạt quay mạnh. Giữ chỗ thoáng cho máy.');
  }

  // ================= Wake Lock =================
  async function requestWakeLock(): Promise<void> {
    if (wakeLockDenied) return;
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
      };
      wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLockDenied = true;
      wakeLock = null;
    }
  }

  function releaseWakeLock(): void {
    void wakeLock?.release().catch(() => undefined);
    wakeLock = null;
  }

  const reacquireWakeLock = (): void => {
    if (document.visibilityState === 'visible' && session?.running) void requestWakeLock();
  };
  document.addEventListener('visibilitychange', reacquireWakeLock);

  // ================= Vòng đo =================
  function pushSample(snap: { level: number; charging: boolean }): void {
    if (!session) return;
    const level = Math.max(0, Math.min(100, Math.round(snap.level * 10) / 10));
    const last = session.samples[session.samples.length - 1];
    if (last && last.level !== level) lastLevelChangeAt = Date.now();
    session.samples.push({ t: Date.now(), level, charging: snap.charging });
  }

  function sample(): void {
    if (!session?.running || !source || disposed) return;
    pushSample(source.get());
    if (
      !stallFlagged &&
      loadSelect.value !== 'off' &&
      Date.now() - lastLevelChangeAt > STALL_MS
    ) {
      stallFlagged = true;
      notice('Mức pin không đổi suốt hơn 30 phút dù đang chạy tải nặng — kết luận sẽ đánh dấu đây là bất thường.');
    }
    persist(session.running ? 'active' : 'ended');
    renderDrain();
  }

  function attachSource(): void {
    if (!source || detachSource) return;
    detachSource = source.onChange(() => {
      if (session?.running) sample();
    });
  }

  function detachSourceListener(): void {
    detachSource?.();
    detachSource = null;
  }

  function startTimers(): void {
    stopTimers();
    sampleTimer = window.setInterval(sample, SAMPLE_MS);
    tickTimer = window.setInterval(renderDrain, 1000);
  }

  function stopTimers(): void {
    if (sampleTimer !== null) {
      window.clearInterval(sampleTimer);
      sampleTimer = null;
    }
    if (tickTimer !== null) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startDrain(resume: boolean): void {
    if (!source || disposed) return;
    resumeAvailable = false;
    if (!resume || !session) session = { samples: [], running: true };
    else session.running = true;
    stallFlagged = false;
    lastLevelChangeAt = Date.now();
    pushSample(source.get());
    attachSource();
    startTimers();
    applyLoad();
    void requestWakeLock();
    btnStart.disabled = true;
    btnStop.disabled = false;
    drainStatus.textContent = 'Đang đo…';
    persist('active');
    notice(
      source.get().charging
        ? 'Đang cắm sạc nên đoạn này chưa được tính. Rút sạc để bắt đầu xả thật; trang sẽ tự tiếp tục.'
        : 'Đang đo. Giữ tab này mở; có thể chuyển sang tab khác nhưng đừng đóng trang.',
    );
    renderDrain();
  }

  function stopDrain(): void {
    if (session) session.running = false;
    stopTimers();
    detachSourceListener();
    terminateLoad();
    releaseWakeLock();
    btnStart.disabled = false;
    btnStart.textContent = 'Đo lại (phiên mới)';
    btnStop.disabled = true;
    drainStatus.textContent = 'Đã dừng đo.';
    persist('ended');
    buildSampleTable();
    renderDrain();
    notice(
      session && session.samples.length >= 2
        ? 'Đã dừng. Xem kết luận ở khối dưới; bảng số liệu từng mẫu nằm trong phần “Bảng số liệu từng mẫu”.'
        : 'Đã dừng. Phiên này chưa đủ hai mốc nên chưa tính được tốc độ xả.',
    );
  }

  // ================= Chế độ nhập tay =================
  function setManualMode(on: boolean): void {
    manualMode = on;
    manualWrap.hidden = !on;
    btnManualToggle.textContent = on ? 'Ẩn nhập tay' : 'Chế độ nhập tay';
    if (on && session?.running) stopDrain();
    if (on) {
      manualStartTime.value = toLocalInputValue(Date.now() - 60 * 60_000);
      manualEndTime.value = toLocalInputValue(Date.now());
      renderDrain();
    }
  }

  function computeManual(): void {
    const startLevel = readPct(manualStartLevel);
    const endLevel = readPct(manualEndLevel);
    const startT = parseLocalInputValue(manualStartTime.value);
    const endT = parseLocalInputValue(manualEndTime.value);
    if (startLevel === null || endLevel === null || startT === null || endT === null) {
      notice('Nhập đủ: mức pin và thời điểm của cả hai mốc.');
      return;
    }
    if (endT <= startT) {
      notice('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
      return;
    }
    manualSamples = [
      { t: startT, level: startLevel, charging: false },
      { t: endT, level: endLevel, charging: false },
    ];
    notice('Đã tính từ hai mốc bạn nhập. Kết luận ở khối dưới cũng đã cập nhật.');
    renderDrain();
  }

  // ================= Xuất kết quả =================
  function exportText(): string {
    const samples = currentSamples();
    const stats = computeDrainStats(samples, fullWh());
    const { design, full, unit, cycles } = readCapacityInputs();
    const lines: string[] = ['KẾT QUẢ KIỂM TRA PIN — Device Check', `Thời điểm: ${fmtClock(Date.now())}`, ''];
    lines.push('--- Dung lượng ---');
    lines.push(`Dung lượng thiết kế: ${design !== null ? `${fmtNum(design)} ${unit === 'wh' ? 'Wh' : 'mAh'}` : '(chưa nhập)'}`);
    lines.push(`Dung lượng đầy hiện tại: ${full !== null ? `${fmtNum(full)} ${unit === 'wh' ? 'Wh' : 'mAh'}` : '(chưa nhập)'}`);
    if (cycles !== null) lines.push(`Số chu kỳ sạc: ${fmtNum(cycles)}`);
    if (design !== null && full !== null && design > 0) {
      const res = computeHealth({ design, full });
      lines.push(`Sức khoẻ pin: ${fmtPct(res.health)} (chai ${fmtPct(res.wearPct)}, mất ${fmtNum(res.lost)} ${unit === 'wh' ? 'Wh' : 'mAh'})`);
    }
    lines.push('', '--- Xả pin ---');
    lines.push(`Số mẫu ghi nhận: ${stats.sampleCount}`);
    if (stats.sampleCount >= 2) {
      lines.push(`Thời gian đo: ${fmtHours(stats.elapsedMs / 3_600_000)} (xả thật ${fmtHours(stats.dischargingMs / 3_600_000)})`);
      lines.push(`Đã xả: ${fmtNum(Math.max(0, stats.drainedPct))}%`);
      lines.push(`Tốc độ xả: ${stats.ratePctPerHour !== null ? `${fmtNum(stats.ratePctPerHour)}%/giờ` : 'chưa đủ 5 phút'}`);
      lines.push(`Còn lại ước tính: ${fmtHours(stats.remainingHours)}`);
      lines.push(`Tổng thời lượng ước tính: ${fmtHours(stats.totalHours)}`);
      if (stats.avgPowerW !== null) lines.push(`Công suất trung bình: ${fmtNum(stats.avgPowerW)} W`);
    }
    const anomalies = collectAnomalies();
    lines.push('', '--- Bất thường ---');
    if (anomalies.length === 0) lines.push('Không có.');
    else for (const a of anomalies) lines.push(`- ${a.label}`);
    lines.push('', '--- Kết luận ---');
    lines.push(finalPill.textContent ?? '');
    for (const li of Array.from(adviceList.querySelectorAll('li'))) lines.push(`- ${li.textContent ?? ''}`);
    return lines.join('\n');
  }

  async function copyResult(): Promise<void> {
    const text = exportText();
    try {
      await navigator.clipboard.writeText(text);
      notice('Đã sao chép kết quả vào bộ nhớ tạm.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      notice('Đã sao chép kết quả vào bộ nhớ tạm.');
    }
  }

  function downloadResult(): void {
    const blob = new Blob([exportText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ket-qua-kiem-tra-pin.txt';
    a.click();
    URL.revokeObjectURL(url);
    notice('Đã tải file ket-qua-kiem-tra-pin.txt.');
  }

  function resetAll(): void {
    if (session?.running) stopDrain();
    clearSession();
    session = null;
    manualSamples = [];
    manualMode = false;
    manualWrap.hidden = true;
    btnManualToggle.textContent = 'Chế độ nhập tay';
    stallFlagged = false;
    capDesign.value = '';
    capFull.value = '';
    capCycles.value = '';
    shutdownInput.value = '';
    btnStart.textContent = 'Bắt đầu đo xả';
    btnStart.disabled = false;
    btnStop.disabled = true;
    tableDetails.hidden = true;
    tableWrap.replaceChildren();
    chartWrap.hidden = true;
    drainStatus.textContent = 'Chưa bắt đầu đo.';
    notice('Đã xoá kết quả và phiên đo trong máy.');
    renderCapacity();
    renderDrain();
  }

  // ================= Sự kiện =================
  for (const input of [capDesign, capFull, capCycles, capUnit]) {
    input.addEventListener('input', () => {
      renderCapacity();
      persist(session?.running ? 'active' : 'ended');
      renderVerdict();
    });
  }
  btnStart.addEventListener('click', () => startDrain(resumeAvailable && session !== null && session.samples.length > 0));
  btnStop.addEventListener('click', () => stopDrain());
  btnManualToggle.addEventListener('click', () => setManualMode(!manualMode));
  btnManualCompute.addEventListener('click', () => computeManual());
  loadSelect.addEventListener('change', () => applyLoad());
  targetInput.addEventListener('input', () => renderDrain());
  shutdownInput.addEventListener('input', () => renderVerdict());
  btnCopy.addEventListener('click', () => void copyResult());
  btnDownload.addEventListener('click', () => downloadResult());
  btnReset.addEventListener('click', () => resetAll());

  // ================= Khởi động =================
  renderCapacity();

  void (async () => {
    const src = MOCK ? createMockBatterySource() : await createRealBatterySource();
    if (disposed) {
      src?.dispose?.();
      return;
    }
    source = src;
    if (!source) {
      btnStart.hidden = true;
      setManualMode(true);
      notice(
        'Trình duyệt này không đọc được mức pin (chỉ Chrome và Edge có Battery API). Dùng chế độ nhập tay bên dưới: ghi lại mức pin và thời gian rồi nhập vào.',
      );
      return;
    }
    if (source.kind === 'mock') {
      notice('Đang chạy chế độ mô phỏng ?mock=1: pin giả tụt 1% mỗi 8 giây để kiểm tra giao diện và công thức.');
    }

    // Phục hồi phiên đo chưa kết thúc (nếu có).
    const stored = loadSession();
    if (stored && stored.status === 'active' && stored.samples.length >= 1 && Date.now() - stored.savedAt < RESUME_MAX_AGE_MS) {
      fillCapacityInputs(stored.capacity);
      session = { samples: stored.samples, running: false };
      resumeAvailable = true;
      btnStart.textContent = 'Tiếp tục phiên trước';
      renderCapacity();
      renderDrain();
      notice(
        `Có phiên đo trước chưa kết thúc (${stored.samples.length} mẫu, lần cuối ${fmtClock(stored.samples[stored.samples.length - 1].t)}). Bấm “Tiếp tục phiên trước” để đo tiếp, hoặc “Đo lại (phiên mới)” để bắt đầu từ đầu.`,
      );
      return;
    }
    if (stored && stored.samples.length >= 1) {
      fillCapacityInputs(stored.capacity);
      renderCapacity();
    }
  })();

  // ================= Dọn dẹp =================
  return () => {
    disposed = true;
    if (session) session.running = false;
    stopTimers();
    detachSourceListener();
    terminateLoad();
    releaseWakeLock();
    source?.dispose?.();
    document.removeEventListener('visibilitychange', reacquireWakeLock);
    root.remove();
  };
}
