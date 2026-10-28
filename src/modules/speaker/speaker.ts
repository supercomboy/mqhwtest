// Bài kiểm tra loa: phát 1 file quét dải trầm/bổng và 2 bản nhạc mẫu, kiểm tra kênh trái/phải và chọn thiết bị phát.
// Toàn bộ chạy trong trình duyệt; âm thanh không rời khỏi máy và không gửi đi đâu cả.
import './speaker.css';
import { AUDIO_BASE, tracks, type Track } from './tracks';

/** Âm lượng mặc định vừa phải để không gây bất ngờ. */
const DEFAULT_VOLUME = 0.6;

/** Ba lựa chọn kênh phát; giá trị pan theo chuẩn StereoPannerNode (-1 trái, 0 giữa, 1 phải). */
const PAN_STEPS: Array<{ id: string; label: string; pan: number }> = [
  { id: 'left', label: 'Chỉ loa trái', pan: -1 },
  { id: 'both', label: 'Cả hai', pan: 0 },
  { id: 'right', label: 'Chỉ loa phải', pan: 1 },
];

/** Câu trả lời tự đánh giá, kèm gợi ý xử lý khi có vấn đề. */
const ANSWERS: Array<{ id: string; label: string; note: string }> = [
  { id: 'clear', label: 'Rõ', note: 'Hai bên nghe đều và rõ. Loa hoạt động tốt.' },
  {
    id: 'weak',
    label: 'Rè hoặc nhỏ',
    note: 'Thử tăng âm lượng hệ thống, đổi thiết bị phát, hoặc bỏ vật cản trước loa.',
  },
  {
    id: 'one-side',
    label: 'Mất một bên',
    note: 'Kiểm tra dây loa/tai nghe và cân bằng trái–phải trong cài đặt âm thanh của hệ điều hành.',
  },
  {
    id: 'none',
    label: 'Không nghe thấy',
    note: 'Kiểm tra âm lượng hệ thống, thiết bị phát đang chọn, và cắm lại tai nghe nếu đang dùng.',
  },
];

interface SinkElement {
  setSinkId(deviceId: string): Promise<void>;
}

interface WindowWithWebkitAudio {
  webkitAudioContext?: typeof AudioContext;
}

/** Chỉ Chrome/Edge có setSinkId; trình duyệt khác (Safari, Firefox) sẽ ẩn mục chọn thiết bị. */
function supportsSetSinkId(): boolean {
  const proto = HTMLMediaElement.prototype as Partial<SinkElement>;
  return typeof proto.setSinkId === 'function';
}

/** Tạo AudioContext nếu trình duyệt hỗ trợ (kể cả Safari cũ dùng tiền tố webkit). */
function createAudioContext(): AudioContext | null {
  const ctor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (typeof ctor !== 'function') return null;
  try {
    return new ctor();
  } catch {
    return null;
  }
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function mountSpeaker(container: HTMLElement): () => void {
  // ---- Trạng thái ----
  let ctx: AudioContext | null = null;
  /** Mỗi HTMLAudioElement chỉ được tạo MediaElementSource một lần. */
  const sources = new Map<HTMLAudioElement, MediaElementAudioSourceNode>();
  const panners = new Map<HTMLAudioElement, StereoPannerNode>();
  const audios: HTMLAudioElement[] = [];
  const played = new Set<string>();
  let panValue = 0;
  let deviceCleanup: (() => void) | null = null;

  // ---- Khung chính ----
  const root = el('div', 'spk');

  const noticeEl = el('div', 'spk__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  const intro = el(
    'p',
    'spk__intro',
    'Bấm “Phát” để nghe thử: thẻ đầu quét dải trầm rồi đến dải bổng, hai thẻ sau là bản nhạc mẫu. Dùng nút kênh để chuyển âm sang loa trái, loa phải hoặc cả hai. Âm thanh chỉ phát trên máy của bạn.',
  );

  // ---- Thiết lập đường âm thanh (tạo trong lần bấm đầu tiên) ----
  const ensureGraph = (audio: HTMLAudioElement): void => {
    if (!ctx) {
      ctx = createAudioContext();
      // Không hỗ trợ Web Audio: vẫn phát bình thường qua đầu ra mặc định.
      if (!ctx) return;
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    if (sources.has(audio)) {
      const existing = panners.get(audio);
      if (existing) existing.pan.value = panValue;
      return;
    }
    try {
      const source = ctx.createMediaElementSource(audio);
      const panner = ctx.createStereoPanner();
      source.connect(panner);
      panner.connect(ctx.destination);
      panner.pan.value = panValue;
      sources.set(audio, source);
      panners.set(audio, panner);
    } catch {
      // Nếu không tạo được node, âm thanh vẫn phát bình thường qua đầu ra mặc định.
      notice('Không thiết lập được bộ xử lý âm thanh, âm thanh vẫn phát bình thường.');
    }
  };

  // ---- Thẻ trình phát cho từng file ----
  function buildTrack(track: Track): HTMLElement {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = AUDIO_BASE + track.file;
    audio.volume = DEFAULT_VOLUME;
    audios.push(audio);

    const card = el('article', 'spk-track');
    const title = el('h3', 'spk-track__title', track.title);
    const desc = el('p', 'spk-track__desc', track.description);
    const segments = track.segments;
    const nowEl = segments ? el('p', 'spk-track__now', segments[0].label) : null;

    const playBtn = el('button', 'btn btn--ghost spk-play', 'Phát');
    playBtn.type = 'button';

    const progress = el('input', 'spk-range spk-range--progress');
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.step = '1';
    progress.value = '0';
    progress.disabled = true;
    progress.setAttribute('aria-label', `Tiến trình ${track.title}`);

    const timeEl = el('span', 'spk-time', '0:00 / 0:00');

    const controls = el('div', 'spk-track__controls');
    controls.append(playBtn, progress, timeEl);

    const volume = el('input', 'spk-range spk-range--volume');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.step = '1';
    volume.value = String(Math.round(DEFAULT_VOLUME * 100));

    const volumeLabel = el('label', 'spk-volume');
    volumeLabel.append(el('span', 'spk-volume__label', 'Âm lượng'), volume);

    card.append(title, desc);
    if (nowEl) card.append(nowEl);
    card.append(controls, volumeLabel);

    let seeking = false;

    /** Hiện tên đoạn đang phát (chỉ file có khai báo segments). */
    const updateSegment = (): void => {
      if (!nowEl || !segments) return;
      let label = segments[0].label;
      for (const seg of segments) {
        if (audio.currentTime + 0.05 >= seg.at) label = seg.label;
      }
      if (nowEl.textContent !== label) nowEl.textContent = label;
    };

    const updateTime = (): void => {
      timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
      updateSegment();
    };

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        // Chỉ phát một bản một lúc cho dễ nghe.
        for (const other of audios) {
          if (other !== audio && !other.paused) other.pause();
        }
        ensureGraph(audio);
        void audio.play().then(
          () => notice(''),
          () =>
            notice('Trình duyệt đã chặn phát âm thanh. Hãy bấm lại vào nút “Phát”.'),
        );
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', () => {
      playBtn.textContent = 'Tạm dừng';
      played.add(track.id);
      playedCell.textContent = tracks
        .filter((t) => played.has(t.id))
        .map((t) => t.title)
        .join(', ');
    });
    audio.addEventListener('pause', () => {
      playBtn.textContent = 'Phát';
    });
    audio.addEventListener('ended', () => {
      playBtn.textContent = 'Phát';
      progress.value = '0';
      updateTime();
    });
    audio.addEventListener('loadedmetadata', () => {
      progress.disabled = false;
      updateTime();
    });
    audio.addEventListener('error', () => {
      notice(`Không tải được file âm thanh “${track.title}”.`);
    });
    audio.addEventListener('timeupdate', () => {
      if (!seeking && Number.isFinite(audio.duration) && audio.duration > 0) {
        progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      }
      updateTime();
    });

    progress.addEventListener('pointerdown', () => {
      seeking = true;
    });
    progress.addEventListener('pointerup', () => {
      seeking = false;
    });
    progress.addEventListener('change', () => {
      seeking = false;
    });
    progress.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
      }
      updateTime();
    });

    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value) / 100;
    });

    return card;
  }

  const listEl = el('div', 'spk__tracks');

  // ---- Bảng tổng hợp kết quả ----
  const playedCell = el('td', 'spk-table__value', '—');
  const answerCell = el('td', 'spk-table__value', '—');
  const adviceEl = el('p', 'spk__advice');

  for (const track of tracks) listEl.append(buildTrack(track));

  // ---- Chọn kênh phát ----
  const channelBtns = PAN_STEPS.map((step) => {
    const btn = el('button', 'spk-seg__btn', step.label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(step.pan === panValue));
    btn.addEventListener('click', () => setPan(step.pan, btn));
    return btn;
  });

  function setPan(value: number, active: HTMLButtonElement): void {
    panValue = value;
    for (const panner of panners.values()) panner.pan.value = value;
    for (const btn of channelBtns) btn.setAttribute('aria-pressed', String(btn === active));
  }

  const channelGroup = el('div', 'spk-seg');
  channelGroup.setAttribute('role', 'group');
  channelGroup.setAttribute('aria-label', 'Chọn kênh phát');
  channelGroup.append(...channelBtns);

  const channelSection = el('section', 'spk__section');
  channelSection.append(el('h3', 'spk__section-title', 'Kiểm tra kênh'), channelGroup);

  // ---- Tự đánh giá kết quả ----
  const answerBtns = ANSWERS.map((answer) => {
    const btn = el('button', 'spk-seg__btn', answer.label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      answerCell.textContent = answer.label;
      adviceEl.textContent = answer.note;
      for (const other of answerBtns) other.setAttribute('aria-pressed', String(other === btn));
    });
    return btn;
  });

  const answerGroup = el('div', 'spk-seg spk-seg--wrap');
  answerGroup.setAttribute('role', 'group');
  answerGroup.setAttribute('aria-label', 'Bạn có nghe rõ cả hai bên không');
  answerGroup.append(...answerBtns);

  const table = el('table', 'spk-table');
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
  tbody.append(builtIn('Đã phát', playedCell), builtIn('Nghe hai bên', answerCell));
  table.append(el('caption', undefined, 'Tổng hợp kết quả'), thead, tbody);

  const confirmSection = el('section', 'spk__section');
  confirmSection.append(
    el('h3', 'spk__section-title', 'Bạn có nghe rõ cả hai bên không?'),
    answerGroup,
    table,
    adviceEl,
  );

  // ---- Chọn thiết bị phát (chỉ khi trình duyệt hỗ trợ setSinkId) ----
  if (supportsSetSinkId()) {
    const wrap = el('div', 'spk__device');
    const labelEl = el('label', 'spk__device-label', 'Thiết bị phát');
    labelEl.htmlFor = 'spk-device';
    const select = el('select', 'spk__device-select');
    select.id = 'spk-device';
    const defaultOpt = el('option', undefined, 'Mặc định (theo hệ thống)');
    defaultOpt.value = '';
    select.append(defaultOpt);
    wrap.append(labelEl, select);

    const applySink = async (deviceId: string): Promise<void> => {
      for (const audio of audios) {
        const sink = audio as unknown as Partial<SinkElement>;
        if (typeof sink.setSinkId !== 'function') continue;
        try {
          await sink.setSinkId(deviceId);
        } catch {
          notice('Không đổi được thiết bị phát. Hãy chọn lại hoặc dùng thiết bị mặc định.');
        }
      }
    };

    const refresh = async (): Promise<void> => {
      const md = navigator.mediaDevices;
      if (!md) return;
      try {
        const devices = await md.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === 'audiooutput');
        const current = select.value;
        while (select.options.length > 1) select.remove(1);
        outputs.forEach((device, index) => {
          const opt = el('option', undefined, device.label || `Thiết bị ${index + 1}`);
          opt.value = device.deviceId;
          select.append(opt);
        });
        select.value = current;
        wrap.hidden = outputs.length === 0;
      } catch {
        wrap.hidden = true;
      }
    };

    select.addEventListener('change', () => {
      void applySink(select.value);
    });

    const onDeviceChange = (): void => {
      void refresh();
    };
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    deviceCleanup = () => {
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
    };

    void refresh();
    root.append(wrap);
  }

  // ---- Ghép giao diện theo thứ tự: giới thiệu, thông báo, thiết bị, danh sách, kênh, kết quả ----
  root.prepend(intro, noticeEl);
  root.append(listEl, channelSection, confirmSection);
  container.append(root);

  // ---- Dọn dẹp khi rời bài kiểm tra ----
  return () => {
    for (const audio of audios) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (ctx) {
      void ctx.close().catch(() => undefined);
      ctx = null;
    }
    sources.clear();
    panners.clear();
    deviceCleanup?.();
    deviceCleanup = null;
    root.remove();
  };
}
