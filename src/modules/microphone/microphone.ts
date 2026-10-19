// Bài kiểm tra micro: đo mức âm thời gian thực, ghi âm thử 5 giây và nghe lại.
// Âm thanh chỉ nằm trong bộ nhớ trang, không bao giờ được gửi lên máy chủ nào.
import './microphone.css';

/** Hai lựa chọn tự đánh giá, kèm gợi ý xử lý khi âm thanh có vấn đề. */
const ANSWERS: Array<{ id: string; label: string; note: string }> = [
  { id: 'ok', label: 'Đạt', note: 'Tiếng thu rõ, đủ lớn và không bị rè.' },
  {
    id: 'bad',
    label: 'Chưa đạt',
    note: 'Thử chọn micro khác ở trên, nói gần micro hơn, tăng âm lượng đầu vào trong cài đặt hệ thống, hoặc đóng ứng dụng khác đang dùng micro.',
  },
];

const UNSUPPORTED =
  'Trình duyệt này không hỗ trợ truy cập micro (thiếu getUserMedia). Hãy thử Chrome, Edge, Firefox hoặc Safari phiên bản mới.';

/** Thời lượng ghi âm thử, tính bằng giây. */
const RECORD_SECONDS = 5;
/** Dưới ngưỡng này coi như tín hiệu quá nhỏ (dBFS). */
const QUIET_DBFS = -50;
/** Chạm ngưỡng này coi như bị vỡ tiếng (dBFS). */
const CLIP_DBFS = -1;
/** Không nghe thấy gì trong bao lâu thì nhắc (mili giây). */
const QUIET_AFTER_MS = 3000;

type ToggleKey = 'echoCancellation' | 'noiseSuppression' | 'autoGainControl';

/** Ba thiết lập thu của micro, dùng để so sánh chất lượng ghi âm. */
const TOGGLES: Array<{ key: ToggleKey; label: string }> = [
  { key: 'echoCancellation', label: 'Khử tiếng vọng' },
  { key: 'noiseSuppression', label: 'Giảm tiếng ồn' },
  { key: 'autoGainControl', label: 'Tự chỉnh âm lượng' },
];

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

function errorName(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
}

/** Dịch lỗi getUserMedia thành hướng dẫn tiếng Việt. */
function describeError(err: unknown): string {
  switch (errorName(err)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Bạn đã từ chối quyền dùng micro. Mở lại quyền cho trang này trong cài đặt trình duyệt (biểu tượng ổ khoá cạnh địa chỉ), rồi bấm “Bật lại”.';
    case 'SecurityError':
      return 'Trang phải chạy trên HTTPS hoặc localhost mới dùng được micro.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Không tìm thấy micro nào trên máy này.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Micro đang bị ứng dụng khác chiếm dụng. Đóng ứng dụng đó rồi thử lại.';
    case 'OverconstrainedError':
      return 'Micro không đáp ứng được yêu cầu. Hãy chọn micro khác rồi thử lại.';
    default:
      return `Không bật được micro${errorName(err) ? ` (${errorName(err)})` : ''}. Hãy thử lại.`;
  }
}

/** Đổi biên độ RMS sang dBFS; im lặng hoàn toàn trả về -Infinity. */
function toDb(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY;
}

/** Chọn định dạng ghi âm mà trình duyệt hỗ trợ (Safari không có webm). */
function pickMimeType(): string | undefined {
  if (typeof window.MediaRecorder !== 'function') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
  ];
  for (const candidate of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function mountMicrophone(container: HTMLElement): () => void {
  // ---- Trạng thái ----
  let stream: MediaStream | null = null;
  let deviceId = '';
  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let rafId: number | null = null;
  let countdownId: number | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let recordedUrl: string | null = null;
  let meterStartedAt = 0;
  let frame = 0;
  /** Bộ đệm dạng sóng, dùng lại mỗi khung hình để không cấp phát liên tục. */
  const samples = new Float32Array(2048);
  let levelDb = Number.NEGATIVE_INFINITY;
  let maxDb = Number.NEGATIVE_INFINITY;
  let heardSound = false;
  let clipDetected = false;

  const supported = typeof navigator.mediaDevices?.getUserMedia === 'function';
  const canRecord = typeof window.MediaRecorder === 'function';
  const mimeType = pickMimeType();

  const toggleState: Record<ToggleKey, boolean> = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // ---- Khung chính ----
  const root = el('div', 'mic');

  const noticeEl = el('div', 'mic__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  const intro = el(
    'p',
    'mic__intro',
    'Bài kiểm tra sẽ mở micro của bạn để đo mức âm và ghi thử. Âm thanh chỉ được xử lý trên máy này, không được tải lên đâu cả. Quyền micro chỉ được xin khi bạn bấm nút bên dưới.',
  );

  // ---- Thẻ bắt đầu (khi micro chưa bật) ----
  const startText = el(
    'p',
    'mic__start-text',
    supported
      ? 'Bấm “Bật micro” để xem mức âm theo thời gian thực và ghi thử 5 giây.'
      : UNSUPPORTED,
  );
  const enableBtn = el('button', 'btn mic__enable', 'Bật micro');
  enableBtn.type = 'button';
  if (!supported) enableBtn.disabled = true;
  const startCard = el('div', 'mic__start');
  startCard.append(startText, enableBtn);

  // ---- Khu vực đo mức âm ----
  const canvas = el('canvas', 'mic__wave');
  canvas.setAttribute('aria-hidden', 'true');

  const levelFill = el('span', 'mic__level-fill');
  const levelTrack = el('div', 'mic__level-track');
  levelTrack.append(levelFill);
  const dbText = el('span', 'mic__db', '—∞ dBFS');
  const levelRow = el('div', 'mic__level');
  levelRow.append(levelTrack, dbText);

  const meter = el('div', 'mic__meter');
  meter.append(canvas, levelRow);

  const warnEl = el('div', 'mic__warn');
  warnEl.setAttribute('role', 'status');

  // ---- Hàng điều khiển ----
  const recBtn = el('button', 'btn btn--ghost mic__rec', `Ghi âm ${RECORD_SECONDS} giây`);
  recBtn.type = 'button';
  const recState = el('span', 'mic__rec-state', canRecord ? '' : 'Trình duyệt này không hỗ trợ ghi âm.');

  const deviceSelect = el('select', 'mic__select');
  deviceSelect.id = 'mic-device';
  deviceSelect.setAttribute('aria-label', 'Chọn micro');
  const defaultOpt = el('option', undefined, 'Micro mặc định');
  defaultOpt.value = '';
  deviceSelect.append(defaultOpt);
  const deviceWrap = el('div', 'mic__device');
  deviceWrap.hidden = true;
  deviceWrap.append(el('span', 'mic__device-label', 'Micro'), deviceSelect);

  const offBtn = el('button', 'btn mic__off', 'Tắt micro');
  offBtn.type = 'button';

  const controls = el('div', 'mic__controls');
  controls.append(recBtn, recState, deviceWrap, offBtn);

  // ---- Công tắc thiết lập thu ----
  const toggleInputs = new Map<ToggleKey, HTMLInputElement>();
  const toggles = el('div', 'mic__toggles');
  for (const { key, label } of TOGGLES) {
    const input = el('input', 'mic__toggle-input');
    input.type = 'checkbox';
    input.checked = toggleState[key];
    input.disabled = !supported;
    toggleInputs.set(key, input);
    const lbl = el('label', 'mic__toggle');
    lbl.append(input, el('span', 'mic__toggle-text', label));
    toggles.append(lbl);
  }
  const toggleHint = el('p', 'mic__hint', 'Đổi công tắc để so sánh chất lượng thu: bài kiểm tra sẽ xin lại micro với thiết lập mới.');

  const live = el('div', 'mic__live');
  live.hidden = true;
  live.append(meter, warnEl, controls, toggles, toggleHint);

  // ---- Nghe lại bản ghi ----
  const audio = el('audio', 'mic__audio');
  audio.controls = true;
  audio.preload = 'none';
  const audioNote = el('p', 'mic__hint', 'Nên đeo tai nghe khi nghe lại để tránh hú (vọng âm).');
  const discardBtn = el('button', 'btn btn--ghost mic__discard', 'Xóa bản ghi');
  discardBtn.type = 'button';
  const playback = el('div', 'mic__playback');
  playback.hidden = true;
  playback.append(audioNote, audio, discardBtn);

  // ---- Bảng tổng hợp kết quả ----
  const deviceCell = el('td', 'mic-table__value', '—');
  const levelCell = el('td', 'mic-table__value', '—');
  const clipCell = el('td', 'mic-table__value', 'Không');
  const recCell = el('td', 'mic-table__value', 'Chưa ghi');
  const answerCell = el('td', 'mic-table__value', '—');
  const adviceEl = el('p', 'mic__advice');

  const table = el('table', 'mic-table');
  const thead = el('thead');
  const headRow = el('tr');
  headRow.append(el('th', undefined, 'Hạng mục'), el('th', undefined, 'Kết quả'));
  thead.append(headRow);
  const tbody = el('tbody');
  const builtIn = (label: string, cell: HTMLTableCellElement): HTMLTableRowElement => {
    const row = el('tr');
    const th = el('th', undefined, label);
    th.setAttribute('scope', 'row');
    row.append(th, cell);
    return row;
  };
  tbody.append(
    builtIn('Micro', deviceCell),
    builtIn('Mức cao nhất', levelCell),
    builtIn('Vỡ tiếng', clipCell),
    builtIn('Ghi âm', recCell),
    builtIn('Nhận xét', answerCell),
  );
  table.append(el('caption', undefined, 'Tổng hợp kết quả'), thead, tbody);

  // ---- Tự đánh giá ----
  const answerBtns = ANSWERS.map((answer) => {
    const btn = el('button', 'mic-seg__btn', answer.label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      answerCell.textContent = answer.label;
      answerCell.classList.toggle('mic-table__value--bad', answer.id !== 'ok');
      adviceEl.textContent = answer.note;
      for (const other of answerBtns) other.setAttribute('aria-pressed', String(other === btn));
    });
    return btn;
  });

  const answerGroup = el('div', 'mic-seg');
  answerGroup.setAttribute('role', 'group');
  answerGroup.setAttribute('aria-label', 'Âm thanh có bình thường không');
  answerGroup.append(...answerBtns);

  const confirmSection = el('section', 'mic__section');
  confirmSection.append(
    el('h3', 'mic__section-title', 'Âm thanh có bình thường không?'),
    answerGroup,
    adviceEl,
    table,
  );

  root.append(intro, noticeEl, startCard, live, playback, confirmSection);
  container.append(root);

  // ---- Màu vẽ dạng sóng (lấy từ tokens.css, không ghi cứng) ----
  let waveColor = '';
  let waveLineColor = '';
  const readColors = (): void => {
    const cs = getComputedStyle(root);
    waveColor = cs.getPropertyValue('--accent').trim();
    waveLineColor = cs.getPropertyValue('--line').trim();
  };

  const sizeCanvas = (): void => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  };

  const drawWave = (): void => {
    const g = canvas.getContext('2d');
    if (!g || !analyser) return;
    const width = canvas.width;
    const height = canvas.height;
    const mid = height / 2;
    const data = samples;
    analyser.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    const db = toDb(Math.sqrt(sum / data.length));

    g.clearRect(0, 0, width, height);
    if (waveLineColor) {
      g.strokeStyle = waveLineColor;
      g.lineWidth = Math.max(1, Math.round(height / 48));
      g.beginPath();
      g.moveTo(0, mid);
      g.lineTo(width, mid);
      g.stroke();
    }
    if (waveColor) {
      g.strokeStyle = waveColor;
      g.lineWidth = Math.max(1, Math.round(height / 32));
      g.beginPath();
      const step = Math.max(1, Math.floor(data.length / width));
      for (let x = 0; x < width; x += 1) {
        const value = data[Math.min(data.length - 1, x * step)];
        const y = mid - value * mid * 0.95;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    // Thanh mức + số dBFS (làm mượt để không nhảy giật).
    if (Number.isFinite(db)) levelDb = Number.isFinite(levelDb) ? levelDb * 0.7 + db * 0.3 : db;
    else levelDb = Number.NEGATIVE_INFINITY;
    const percent = Number.isFinite(levelDb)
      ? Math.min(100, Math.max(0, ((levelDb + 60) / 60) * 100))
      : 0;
    levelFill.style.width = `${percent.toFixed(1)}%`;

    frame += 1;
    if (frame % 4 === 0) {
      dbText.textContent = Number.isFinite(levelDb) ? `${levelDb.toFixed(1)} dBFS` : '—∞ dBFS';
    }

    if (Number.isFinite(db)) {
      if (db > maxDb) maxDb = db;
      if (db > QUIET_DBFS) heardSound = true;
      if (db >= CLIP_DBFS && !clipDetected) {
        clipDetected = true;
        levelFill.classList.add('mic__level-fill--clip');
        clipCell.textContent = 'Có';
        clipCell.classList.add('mic-table__value--bad');
      }
    }

    if (clipDetected) {
      warnEl.textContent =
        'Tín hiệu bị vỡ tiếng (đỉnh chạm 0 dBFS). Hãy nói xa micro hơn hoặc giảm âm lượng đầu vào.';
    } else if (!heardSound && performance.now() - meterStartedAt > QUIET_AFTER_MS) {
      warnEl.textContent =
        'Mức tín hiệu quá nhỏ. Hãy nói gần micro hơn hoặc tăng âm lượng đầu vào trong cài đặt hệ thống.';
    } else if (warnEl.textContent) {
      warnEl.textContent = '';
    }
  };

  const startMeter = (): void => {
    if (rafId !== null || !analyser) return;
    const loop = (): void => {
      drawWave();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  };

  const stopMeter = (): void => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };

  // ---- Đồ thị âm thanh ----
  const ensureGraph = (): void => {
    if (!stream) return;
    if (!ctx) {
      const ctor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (typeof ctor !== 'function') return;
      try {
        ctx = new ctor();
      } catch {
        ctx = null;
        return;
      }
    }
    if (ctx.state === 'suspended') void ctx.resume();
    source?.disconnect();
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    // Nối qua gain 0 vào đích: đồ thị được xử lý nhưng không phát ra tiếng, tránh hú.
    const silent = ctx.createGain();
    silent.gain.value = 0;
    analyser.connect(silent);
    silent.connect(ctx.destination);
    readColors();
    sizeCanvas();
    startMeter();
  };

  // ---- Luồng micro ----
  const audioConstraints = (): MediaTrackConstraints => {
    const wanted: MediaTrackConstraints = {
      echoCancellation: toggleState.echoCancellation,
      noiseSuppression: toggleState.noiseSuppression,
      autoGainControl: toggleState.autoGainControl,
    };
    if (deviceId) wanted.deviceId = { exact: deviceId };
    return wanted;
  };

  const openStream = async (): Promise<MediaStream> => {
    const md = navigator.mediaDevices;
    try {
      return await md.getUserMedia({ audio: audioConstraints(), video: false });
    } catch (err) {
      if (errorName(err) === 'OverconstrainedError') {
        // Ràng buộc không thỏa được: xin lại kiểu tối giản.
        return await md.getUserMedia({ audio: true, video: false });
      }
      throw err;
    }
  };

  const stopStream = (): void => {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.onended = null;
      track.stop();
    }
    stream = null;
  };

  const clearRecording = (): void => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
    }
    chunks = [];
    audio.removeAttribute('src');
    audio.load();
    playback.hidden = true;
    recCell.textContent = 'Chưa ghi';
  };

  const syncToggles = (track: MediaStreamTrack): void => {
    const settings = track.getSettings() as Record<string, unknown>;
    for (const { key } of TOGGLES) {
      const value = settings[key];
      if (typeof value === 'boolean') {
        toggleState[key] = value;
        const input = toggleInputs.get(key);
        if (input) input.checked = value;
      }
    }
  };

  const attach = (next: MediaStream, resetRecording: boolean): void => {
    stopStream();
    stream = next;
    ensureGraph();

    const track = next.getAudioTracks()[0];
    if (track) {
      track.onended = () => {
        notice('Micro đã bị ngắt kết nối hoặc bị ứng dụng khác lấy mất.');
        stop();
      };
      const settings = track.getSettings();
      if (typeof settings.deviceId === 'string' && settings.deviceId) deviceId = settings.deviceId;
      deviceCell.textContent = track.label || 'Micro mặc định';
      syncToggles(track);
    }

    // Bắt đầu lượt đo mới.
    maxDb = Number.NEGATIVE_INFINITY;
    levelDb = Number.NEGATIVE_INFINITY;
    heardSound = false;
    clipDetected = false;
    meterStartedAt = performance.now();
    levelFill.classList.remove('mic__level-fill--clip');
    levelFill.style.width = '0%';
    clipCell.textContent = 'Không';
    clipCell.classList.remove('mic-table__value--bad');
    warnEl.textContent = '';

    if (resetRecording) clearRecording();

    live.hidden = false;
    startCard.hidden = true;
    // Phải đo lại canvas sau khi vùng hiện ra, nếu không bề rộng vẫn là 0.
    sizeCanvas();
    void refreshDevices();
  };

  const stop = (): void => {
    stopRecorder();
    stopMeter();
    stopStream();
    live.hidden = true;
    startCard.hidden = false;
    deviceWrap.hidden = true;
    levelCell.textContent = '—';
    deviceCell.textContent = '—';
    warnEl.textContent = '';
    recState.textContent = canRecord ? '' : 'Trình duyệt này không hỗ trợ ghi âm.';
  };

  const start = async (): Promise<void> => {
    if (!supported) {
      notice(UNSUPPORTED);
      return;
    }
    enableBtn.disabled = true;
    enableBtn.textContent = 'Đang xin quyền…';
    try {
      const next = await openStream();
      attach(next, true);
      notice('');
    } catch (err) {
      notice(describeError(err));
    } finally {
      enableBtn.disabled = false;
      enableBtn.textContent = 'Bật lại';
    }
  };

  const switchDevice = async (id: string): Promise<void> => {
    const previous = deviceId;
    deviceId = id;
    // Đổi micro cần mở lại luồng: dừng luồng cũ trước để nhường thiết bị.
    stopStream();
    try {
      attach(await openStream(), false);
      notice('');
    } catch (err) {
      deviceId = previous;
      notice(describeError(err));
      try {
        attach(await openStream(), false);
      } catch {
        stop();
      }
    }
  };

  /** Áp lại thiết lập thu sau khi người dùng đổi công tắc EC/NS/AGC. */
  const reapplyToggles = async (): Promise<void> => {
    if (!stream) return;
    try {
      attach(await openStream(), false);
      notice('');
    } catch (err) {
      notice(describeError(err));
    }
  };

  // ---- Ghi âm thử ----
  function stopRecorder(): void {
    if (countdownId !== null) {
      window.clearInterval(countdownId);
      countdownId = null;
    }
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recBtn.textContent = `Ghi âm ${RECORD_SECONDS} giây`;
  }

  const finishRecording = (): void => {
    const started = recordStartedAt;
    const seconds = started ? (performance.now() - started) / 1000 : RECORD_SECONDS;
    const blob = new Blob(chunks, { type: recorder?.mimeType || mimeType || 'audio/webm' });
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    recordedUrl = URL.createObjectURL(blob);
    audio.src = recordedUrl;
    playback.hidden = false;
    recState.textContent = `Đã ghi ${seconds.toFixed(1)} giây.`;
    recCell.textContent = `Đã ghi ${seconds.toFixed(1)} giây`;
    notice('');
  };

  let recordStartedAt = 0;

  const startRecording = (): void => {
    if (!stream || !canRecord) return;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      notice('Không ghi âm được trên trình duyệt này.');
      return;
    }
    chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = finishRecording;
    recordStartedAt = performance.now();
    recorder.start();
    recBtn.textContent = 'Dừng ghi';
    recState.textContent = `Đang ghi… còn ${RECORD_SECONDS} giây`;
    countdownId = window.setInterval(() => {
      const elapsed = (performance.now() - recordStartedAt) / 1000;
      if (elapsed >= RECORD_SECONDS) {
        stopRecorder();
        return;
      }
      recState.textContent = `Đang ghi… còn ${(RECORD_SECONDS - elapsed).toFixed(1)} giây`;
    }, 100);
  };

  // ---- Danh sách micro ----
  let deviceCleanup: (() => void) | null = null;

  async function refreshDevices(): Promise<void> {
    const md = navigator.mediaDevices;
    if (!md) return;
    try {
      const devices = (await md.enumerateDevices()).filter((d) => d.kind === 'audioinput');
      while (deviceSelect.options.length > 1) deviceSelect.remove(1);
      devices.forEach((device, index) => {
        const opt = el('option', undefined, device.label || `Micro ${index + 1}`);
        opt.value = device.deviceId;
        deviceSelect.append(opt);
      });
      if (stream) {
        // Tên thiết bị chỉ có sau khi đã được cấp quyền.
        deviceSelect.value = deviceId;
        const active = devices.find((d) => d.deviceId === deviceId);
        if (active) deviceCell.textContent = active.label || 'Micro mặc định';
      }
      deviceWrap.hidden = !stream || devices.length === 0;
    } catch {
      deviceWrap.hidden = true;
    }
  }

  // ---- Sự kiện ----
  enableBtn.addEventListener('click', () => {
    void start();
  });

  offBtn.addEventListener('click', () => {
    stop();
    notice('Đã tắt micro.');
  });

  recBtn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') {
      stopRecorder();
      return;
    }
    startRecording();
  });

  discardBtn.addEventListener('click', () => {
    clearRecording();
    recState.textContent = canRecord ? '' : 'Trình duyệt này không hỗ trợ ghi âm.';
  });

  for (const [key, input] of toggleInputs) {
    input.addEventListener('change', () => {
      toggleState[key] = input.checked;
      void reapplyToggles();
    });
  }

  deviceSelect.addEventListener('change', () => {
    const id = deviceSelect.value;
    if (!id || id === deviceId) return;
    void switchDevice(id);
  });

  if (navigator.mediaDevices) {
    const onDeviceChange = (): void => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    deviceCleanup = () => {
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
    };
  }

  const onPageHide = (): void => {
    stopStream();
  };
  window.addEventListener('pagehide', onPageHide);

  // Canvas vẽ theo bề rộng thật của khung, kể cả khi khung đổi kích thước.
  const observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (!live.hidden) sizeCanvas();
        })
      : null;
  observer?.observe(canvas);

  // Cập nhật mức cao nhất vào bảng một cách định kỳ (không cần mỗi khung hình).
  const summaryTimer = window.setInterval(() => {
    if (Number.isFinite(maxDb)) levelCell.textContent = `${maxDb.toFixed(1)} dBFS`;
  }, 500);

  // ---- Dọn dẹp khi rời bài kiểm tra ----
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    observer?.disconnect();
    window.clearInterval(summaryTimer);
    stopRecorder();
    stopMeter();
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
    }
    recorder = null;
    stopStream();
    deviceCleanup?.();
    deviceCleanup = null;
    source?.disconnect();
    source = null;
    analyser = null;
    const closing = ctx?.close();
    if (closing) void closing.catch(() => undefined);
    ctx = null;
    root.remove();
  };
}
