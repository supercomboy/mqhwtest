// Bài kiểm tra màn hình: chuỗi slide toàn màn hình để soi điểm chết, điểm sáng
// kẹt, ám màu, dải xám, méo hình, độ nét chữ và bóng mờ (ghosting).
// Không có gì được gửi lên máy chủ; mọi thứ chạy ngay trong trang.
import './display.css';

type SlideKind = 'solid' | 'ramp' | 'grid' | 'shapes' | 'text' | 'motion';

interface Slide {
  id: string;
  name: string;
  /** Người dùng nên nhìn gì ở bài này. */
  hint: string;
  kind: SlideKind;
  /** Chỉ dùng cho bài màu thuần. */
  color?: string;
}

/**
 * Màu của vật thể kiểm tra phải là màu thật (đỏ, xanh, trắng, đen, xám) để soi
 * đúng tấm nền, nên không lấy từ token giao diện. Chỉ dùng trong bài kiểm tra.
 */
const TEST = {
  white: '#ffffff',
  black: '#000000',
} as const;

/** Một lượt khối vuông chạy ngang hết màn hình mất khoảng 5 giây. */
const PASS_MS = 5000;
/** Thời gian hiện bảng số bài rồi tự ẩn. */
const BADGE_MS = 4000;
/** Đo tần số quét trong bao lâu (mili giây). */
const MEASURE_MS = 2000;

const SLIDES: Slide[] = [
  { id: 'red', name: 'Đỏ', hint: 'Soi điểm chết, điểm sáng bị kẹt và ám màu.', kind: 'solid', color: '#ff0000' },
  { id: 'green', name: 'Xanh lá', hint: 'Soi điểm chết và ám màu ở vùng xanh lá.', kind: 'solid', color: '#00ff00' },
  { id: 'blue', name: 'Xanh dương', hint: 'Soi điểm chết và ám màu ở vùng xanh dương.', kind: 'solid', color: '#0000ff' },
  { id: 'white', name: 'Trắng', hint: 'Nền sáng đều giúp thấy điểm chết và vết bẩn.', kind: 'solid', color: '#ffffff' },
  { id: 'gray', name: 'Xám 50%', hint: 'Nền xám dễ lộ điểm chết và ám màu nhẹ nhất.', kind: 'solid', color: '#808080' },
  {
    id: 'black',
    name: 'Màn hình đen',
    hint: 'Tắt đèn phòng để soi rò sáng ở viền và vùng sáng không đều.',
    kind: 'solid',
    color: '#000000',
  },
  { id: 'ramp', name: 'Dải xám', hint: 'Tìm sọc bậc (banding) và chỗ mất chi tiết ở vùng tối, vùng sáng.', kind: 'ramp' },
  { id: 'grid', name: 'Lưới ô vuông', hint: 'Ô lưới phải đều nhau; đường kẻ không được cong hay dày mỏng bất thường.', kind: 'grid' },
  { id: 'shapes', name: 'Vòng tròn và đường chéo', hint: 'Vòng tròn phải tròn, hình vuông không bị dẹt hay lệch tỷ lệ.', kind: 'shapes' },
  { id: 'text', name: 'Chữ và độ nét', hint: 'Chữ nhỏ phải sắc, không bị nhoè hay dính vào nhau.', kind: 'text' },
  { id: 'motion', name: 'Chuyển động', hint: 'Khối vuông chạy ngang: soi bóng mờ (ghosting) và hiện tượng giật hình.', kind: 'motion' },
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

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export function mountDisplay(container: HTMLElement): () => void {
  const root = el('div', 'dsp');

  // ---- Phần giới thiệu trong hộp thoại ----
  const intro = el(
    'p',
    'dsp__intro',
    'Bài kiểm tra sẽ lần lượt chiếm trọn màn hình để soi tấm nền: điểm chết, ám màu, dải xám, méo hình, độ nét chữ và bóng mờ. Bạn có thể thoát bất cứ lúc nào bằng phím Esc.',
  );

  const noticeEl = el('div', 'dsp__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  const table = el('table', 'dsp-table');
  const caption = el('caption', undefined, 'Thông tin màn hình');
  const thead = el('thead');
  const headRow = el('tr');
  headRow.append(el('th', undefined, 'Thông số'), el('th', undefined, 'Giá trị'));
  thead.append(headRow);
  const tbody = el('tbody');

  const builtIn = (label: string, cell: HTMLElement): HTMLTableRowElement => {
    const row = el('tr');
    const th = el('th', undefined, label);
    th.setAttribute('scope', 'row');
    row.append(th, cell);
    tbody.append(row);
    return row;
  };

  const cssCell = el('td');
  const physCell = el('td');
  const depthCell = el('td');
  const gamutCell = el('td');
  const hdrCell = el('td');
  const hzCell = el('td', undefined, 'Đang đo…');
  builtIn('Độ phân giải (CSS)', cssCell);
  builtIn('Độ phân giải vật lý (ước tính)', physCell);
  builtIn('Độ sâu màu', depthCell);
  builtIn('Dải màu rộng', gamutCell);
  builtIn('HDR', hdrCell);
  builtIn('Tần số quét (ước tính)', hzCell);

  table.append(caption, thead, tbody);

  const dpr = window.devicePixelRatio || 1;
  cssCell.textContent = `${window.screen.width} × ${window.screen.height} px`;
  physCell.textContent = `${Math.round(window.screen.width * dpr)} × ${Math.round(
    window.screen.height * dpr,
  )} px`;
  depthCell.textContent = `${window.screen.colorDepth}-bit`;
  gamutCell.textContent = matches('(color-gamut: p3)') ? 'Có (P3)' : 'Không (chỉ sRGB)';
  hdrCell.textContent = matches('(dynamic-range: high)') ? 'Có' : 'Không';

  const startBtn = el('button', 'btn dsp__start', 'Bắt đầu kiểm tra');
  startBtn.type = 'button';
  const remeasureBtn = el('button', 'btn btn--ghost dsp__remeasure', 'Đo lại tần số quét');
  remeasureBtn.type = 'button';
  const actions = el('div', 'dsp__actions');
  actions.append(startBtn, remeasureBtn);

  const hint = el(
    'p',
    'dsp__hint',
    'Trong bài kiểm tra: Space, Enter hoặc nhấp chuột để sang bài tiếp · mũi tên trái để quay lại · Esc để thoát.',
  );

  // ---- Khung toàn màn hình ----
  const stage = el('div', 'dsp-stage');
  stage.hidden = true;
  stage.tabIndex = -1;
  const canvas = el('canvas', 'dsp-canvas');
  const square = el('div', 'dsp-square');
  square.hidden = true;
  square.style.backgroundColor = TEST.white;
  const badge = el('div', 'dsp-badge');
  const badgeCount = el('strong', 'dsp-badge__count');
  const badgeName = el('span', 'dsp-badge__name');
  const badgeHint = el('span', 'dsp-badge__hint');
  badge.append(badgeCount, badgeName, badgeHint);
  stage.append(canvas, square, badge);

  root.append(intro, noticeEl, table, actions, hint, stage);
  container.append(root);

  const ctx2d = canvas.getContext('2d');
  let size = { w: 1, h: 1 };
  let index = 0;
  let running = false;
  let disposed = false;
  let measuring = false;
  let rafId = 0;
  let badgeTimer = 0;
  let measureTimer = 0;
  let passStart = 0;

  // ---- Đo tần số quét ----
  function measureRefreshRate(): void {
    if (measuring || disposed) return;
    measuring = true;
    hzCell.textContent = 'Đang đo…';
    const started = performance.now();
    let frames = 0;
    const finish = (count: number, elapsed: number): void => {
      window.clearTimeout(measureTimer);
      measuring = false;
      const hz = Math.max(1, Math.round((count / elapsed) * 1000));
      hzCell.textContent = `${hz} Hz`;
    };
    window.clearTimeout(measureTimer);
    // Trình duyệt có thể hạn chế khung hình (tab ẩn, tiết kiệm pin): đừng treo ở "Đang đo…".
    measureTimer = window.setTimeout(() => {
      if (!measuring) return;
      measuring = false;
      hzCell.textContent = 'Không đo được (trình duyệt đang hạn chế khung hình)';
    }, MEASURE_MS + 1500);
    const step = (now: number): void => {
      if (disposed) {
        measuring = false;
        return;
      }
      frames += 1;
      const elapsed = now - started;
      if (elapsed >= MEASURE_MS) {
        finish(frames, elapsed);
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- Vẽ nội dung bài kiểm tra ----
  function sizeCanvas(): void {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    size = {
      w: Math.max(1, Math.round(rect.width)),
      h: Math.max(1, Math.round(rect.height)),
    };
    canvas.width = Math.round(size.w * ratio);
    canvas.height = Math.round(size.h * ratio);
    if (ctx2d) ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawRamp(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const barH = Math.round(h * 0.72);
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, TEST.black);
    gradient.addColorStop(1, TEST.white);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, barH);

    // Vạch bậc để thấy chỗ mất chi tiết ở vùng tối và vùng sáng.
    const steps = 32;
    const patchW = w / steps;
    const patchH = h - barH;
    for (let i = 0; i < steps; i += 1) {
      const value = Math.round((i / (steps - 1)) * 255);
      ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
      ctx.fillRect(i * patchW, barH, patchW + 1, patchH);
      ctx.fillStyle = TEST.black;
      ctx.fillRect(Math.round(i * patchW), barH, 1, patchH);
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = TEST.black;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = TEST.white;
    ctx.lineWidth = 1;
    const step = Math.max(16, Math.round(Math.min(w, h) / 14));
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  function drawShapes(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = TEST.black;
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.4;
    ctx.strokeStyle = TEST.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();
    ctx.fillStyle = TEST.white;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawText(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const half = Math.round(h / 2);
    const sizes = [9, 10, 11, 12, 14, 18, 24];
    const write = (dark: boolean): void => {
      ctx.fillStyle = dark ? TEST.black : TEST.white;
      const top = dark ? half : 0;
      const height = dark ? h - half : half;
      let y = top + Math.max(10, height * 0.08);
      for (const fontSize of sizes) {
        ctx.font = `${fontSize}px ${family}`;
        ctx.textBaseline = 'top';
        ctx.fillText(`${fontSize}px — Chữ nhỏ, số 0123456789 và ký tự |lI1`, 20, y);
        y += fontSize * 1.7;
        if (y > top + height - fontSize) break;
      }
      // Vạch dọc 1px để soi mật độ điểm ảnh.
      for (let x = 20; x < w - 20; x += 4) {
        ctx.fillRect(x, top + height - 8, 1, 6);
      }
    };
    ctx.fillStyle = TEST.black;
    ctx.fillRect(0, 0, w, half);
    ctx.fillStyle = TEST.white;
    ctx.fillRect(0, half, w, h - half);
    write(false);
    write(true);
  }

  function drawCanvas(slide: Slide): void {
    if (!ctx2d) return;
    const { w, h } = size;
    switch (slide.kind) {
      case 'solid':
        ctx2d.fillStyle = slide.color ?? TEST.black;
        ctx2d.fillRect(0, 0, w, h);
        break;
      case 'ramp':
        drawRamp(ctx2d, w, h);
        break;
      case 'grid':
        drawGrid(ctx2d, w, h);
        break;
      case 'shapes':
        drawShapes(ctx2d, w, h);
        break;
      case 'text':
        drawText(ctx2d, w, h);
        break;
      case 'motion':
        ctx2d.fillStyle = TEST.black;
        ctx2d.fillRect(0, 0, w, h);
        break;
      default:
        break;
    }
  }

  // ---- Vòng lặp cho bài chuyển động ----
  function tick(now: number): void {
    if (!running || disposed) return;
    const slide = SLIDES[index];
    if (slide.kind === 'motion') {
      const trackWidth = size.w;
      const blockWidth = square.offsetWidth || 90;
      const distance = trackWidth + blockWidth;
      const progress = ((now - passStart) % PASS_MS) / PASS_MS;
      const x = Math.round(progress * distance - blockWidth);
      square.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    rafId = requestAnimationFrame(tick);
  }

  function startLoop(): void {
    if (!rafId) {
      passStart = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop(): void {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function showBadge(): void {
    badge.classList.remove('dsp-badge--hidden');
    window.clearTimeout(badgeTimer);
    badgeTimer = window.setTimeout(() => badge.classList.add('dsp-badge--hidden'), BADGE_MS);
  }

  function draw(): void {
    const slide = SLIDES[index];
    drawCanvas(slide);
    const isMotion = slide.kind === 'motion';
    square.hidden = !isMotion;
    badgeCount.textContent = `${index + 1}/${SLIDES.length}`;
    badgeName.textContent = slide.name;
    badgeHint.textContent = slide.hint;
    if (isMotion) {
      square.style.transform = 'translate3d(0, 0, 0)';
      startLoop();
    } else {
      stopLoop();
    }
  }

  function go(delta: number): void {
    index = (index + delta + SLIDES.length) % SLIDES.length;
    draw();
    showBadge();
  }

  // ---- Vào / ra chế độ toàn màn hình ----
  function useOverlayFallback(message: string): void {
    stage.classList.add('dsp-stage--overlay');
    notice(message);
  }

  function begin(): void {
    if (running) return;
    running = true;
    stage.hidden = false;
    sizeCanvas();
    index = 0;
    draw();
    showBadge();
    stage.focus();
  }

  function start(): void {
    if (running) return;
    notice('');
    const needsOverlay = typeof stage.requestFullscreen !== 'function';
    if (needsOverlay) {
      useOverlayFallback(
        'Trình duyệt này không có chế độ toàn màn hình. Đang dùng lớp phủ kín màn hình thay thế. Trên iPhone, hãy chọn “Thêm vào Màn hình chính” rồi mở lại để có toàn màn hình thật.',
      );
      begin();
      return;
    }
    // Phải hiện khung trước khi xin toàn màn hình, và vẫn trong sự kiện bấm.
    stage.hidden = false;
    stage.requestFullscreen().then(
      () => begin(),
      () => {
        useOverlayFallback('Trình duyệt không cho vào toàn màn hình. Đang dùng lớp phủ kín màn hình thay thế.');
        begin();
      },
    );
  }

  function stop(): void {
    if (!running) return;
    running = false;
    stopLoop();
    window.clearTimeout(badgeTimer);
    stage.hidden = true;
    stage.classList.remove('dsp-stage--overlay');
    square.style.transform = 'translate3d(0, 0, 0)';
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
    }
    notice('');
    startBtn.focus();
  }

  // ---- Sự kiện ----
  function onKeydown(e: KeyboardEvent): void {
    if (!running) return;
    switch (e.key) {
      case ' ':
      case 'Enter':
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        go(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        go(-1);
        break;
      case 'Tab':
        // Không cho bàn phím nhảy ra ngoài khung khi đang kiểm tra.
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'Escape':
        if (stage.classList.contains('dsp-stage--overlay')) {
          e.preventDefault();
          e.stopPropagation();
          stop();
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
      case 'Home':
      case 'End':
        e.preventDefault();
        e.stopPropagation();
        break;
      default:
        break;
    }
  }

  function onStageClick(): void {
    if (running) go(1);
  }

  function onFullscreenChange(): void {
    if (!running) return;
    if (document.fullscreenElement !== stage && !stage.classList.contains('dsp-stage--overlay')) {
      // Người dùng thoát bằng Esc hoặc nút của trình duyệt.
      stop();
      return;
    }
    sizeCanvas();
    draw();
    showBadge();
  }

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => {
      if (!running) return;
      sizeCanvas();
      draw();
    });
    observer.observe(stage);
  }

  startBtn.addEventListener('click', start);
  remeasureBtn.addEventListener('click', measureRefreshRate);
  stage.addEventListener('click', onStageClick);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  window.addEventListener('keydown', onKeydown, true);

  measureRefreshRate();

  return () => {
    disposed = true;
    measuring = false;
    stopLoop();
    window.clearTimeout(badgeTimer);
    window.clearTimeout(measureTimer);
    observer?.disconnect();
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('keydown', onKeydown, true);
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen().catch(() => undefined);
    }
    root.remove();
  };
}
