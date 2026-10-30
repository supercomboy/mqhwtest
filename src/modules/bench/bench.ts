// Bài kiểm tra CPU & GPU: kiểm tra tải (stress test) và benchmark bằng thuật toán toán học
// chạy song song. Lấy cảm hứng từ mprep.info/gpu nhưng tự viết bằng WebGL2 + Web Worker
// (không nhúng gpu.js). Mọi phép tính chạy ngay trên máy người dùng, không gọi API ngoài.
import './bench.css';
import { GpuRenderer } from './gpu-gl';

/** Cạnh vùng vẽ: 1000×1000 = 1.000.000 texel, giống output [1e6] của gpu.js. */
const GPU_SIZE = 1000;
/** Số vòng lặp toán học trong shader cho mỗi texel (kernel `size` của gpu.js). */
const GPU_LOOP = 10000;
/** Số khung hình được đo (mprep cũng dùng 400). */
const GPU_FRAMES = 400;
/** Số vòng lặp mỗi worker CPU (mprep dùng 1e10, rút gọn để bài kiểm tra chạy vừa phải). */
const CPU_ITERS = 5e7;

/** Chế độ kiểm thử nhanh `?quick`: tham số nhỏ lại, chỉ dùng cho kiểm tra tự động. */
const QUICK = new URLSearchParams(window.location.search).has('quick');
/** Chế độ kiểm thử `?mainthread=1`: ép chạy GPU trên tab chính (như trình duyệt thiếu WebGL trong worker). */
const FORCE_MAIN_THREAD_GPU = new URLSearchParams(window.location.search).has('mainthread');

const PARAM = QUICK
  ? { gpuSize: 200, gpuLoop: 64, gpuFrames: 8, cpuIters: 2e6 }
  : { gpuSize: GPU_SIZE, gpuLoop: GPU_LOOP, gpuFrames: GPU_FRAMES, cpuIters: CPU_ITERS };

type WorkerEvent =
  | { ev: 'ready' }
  | { ev: 'progress'; pct: number }
  | { ev: 'result'; ms: number; out?: number }
  | { ev: 'error'; message: string };

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

function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function fmtScore(score: number): string {
  return `${Math.floor(score).toLocaleString('vi-VN')} phép tính/µs`;
}

function cpuCores(): number {
  return Math.max(1, Math.min(32, navigator.hardwareConcurrency || 4));
}

/** Tên card GPU (nếu trình duyệt cho phép đọc), đọc một lần rồi ghi nhớ. */
function detectGpuName(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const gl = canvas.getContext('webgl2');
    if (!gl) return 'Không xác định (thiếu WebGL2)';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = String(
      ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    return raw.trim() || 'Không xác định';
  } catch {
    return 'Không xác định';
  }
}

export function mountBench(container: HTMLElement): () => void {
  const root = el('div', 'bench');

  // ---- Trạng thái dùng chung ----
  let stressWorkers: Worker[] = [];
  let benchWorkers: Worker[] = [];
  let elapsedTimer: number | null = null;
  let stressStartedAt = 0;
  let stormRaf = 0;
  let benchRaf = 0;
  /** Canvas + renderer chạy trên tab chính; giữ tham chiếu canvas để không bị thu gom. */
  let stormFallback: { canvas: HTMLCanvasElement; renderer: GpuRenderer } | null = null;
  let benchFallback: { canvas: HTMLCanvasElement; renderer: GpuRenderer } | null = null;
  let stopStorm = false;
  let benchCancelled = false;
  let disposed = false;
  let gpuName: string | null = null;

  // ---- Giới thiệu + thông báo ----
  const intro = el(
    'p',
    'bench__intro',
    'Bài này nạp CPU và GPU bằng một dải phép tính toán học chạy song song (cùng ý tưởng với mprep.info/gpu, nhưng tự viết bằng WebGL2 và Web Worker). Mọi phép tính chạy ngay trên máy của bạn, không có dữ liệu nào được gửi đi.',
  );

  const noticeEl = el('div', 'bench__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  // ================= Kiểm tra tải =================
  const stressSection = el('section', 'bench__section');
  const stressTitle = el('h3', 'bench__title', 'Kiểm tra tải (stress test)');
  const stressDesc = el(
    'p',
    'bench__desc',
    'Giữ tải liên tục trên CPU, GPU hoặc cả hai để xem máy có quá nhiệt, quá tải hay treo không. Lưu mọi việc đang mở trước khi bắt đầu.',
  );
  const stressActions = el('div', 'bench__actions');
  const btnStressGpu = mkButton('Nạp GPU');
  const btnStressCpu = mkButton('Nạp CPU');
  const btnStressBoth = mkButton('Nạp CPU & GPU');
  const btnStop = mkButton('Dừng');
  btnStop.disabled = true;
  stressActions.append(btnStressGpu, btnStressCpu, btnStressBoth, btnStop);

  const stressStatus = el('p', 'bench__status', 'Trạng thái: chưa chạy');
  const stressElapsed = el('p', 'bench__status', 'Thời gian: 0:00');
  stressSection.append(stressTitle, stressDesc, stressActions, stressStatus, stressElapsed);

  // ================= Benchmark =================
  const benchSection = el('section', 'bench__section');
  const benchTitle = el('h3', 'bench__title', 'Benchmark');
  const benchDesc = el(
    'p',
    'bench__desc',
    'Đo số phép tính mỗi micro-giây. Điểm cao hơn là máy tính nhanh hơn trong đúng bài toán này.',
  );
  const benchActions = el('div', 'bench__actions');
  const btnBenchGpu = mkButton('Benchmark GPU');
  const btnBenchCpu = mkButton('Benchmark CPU');
  const btnBenchStop = mkButton('Dừng');
  btnBenchStop.disabled = true;
  benchActions.append(btnBenchGpu, btnBenchCpu, btnBenchStop);

  const benchStatus = el('p', 'bench__status', 'Chưa chạy benchmark nào.');
  const benchBar = el('div', 'bench__bar');
  benchBar.setAttribute('role', 'progressbar');
  benchBar.setAttribute('aria-valuemin', '0');
  benchBar.setAttribute('aria-valuemax', '100');
  benchBar.setAttribute('aria-valuenow', '0');
  benchBar.setAttribute('aria-label', 'Tiến trình benchmark');
  const benchBarFill = el('div', 'bench__bar-fill');
  benchBar.append(benchBarFill);

  const results = el('div', 'bench__results');
  const rowGpuScore = addResultRow(results, 'Điểm GPU');
  const rowGpuName = addResultRow(results, 'Card GPU');
  const rowCpuScore = addResultRow(results, 'Điểm CPU (đa luồng)');
  const rowCpuSingle = addResultRow(results, 'Điểm CPU (đơn luồng)');
  const rowTotal = addResultRow(results, 'Tổng thời gian');
  const rowCores = addResultRow(results, 'Số luồng CPU dùng được');

  benchSection.append(benchTitle, benchDesc, benchActions, benchStatus, benchBar, results);

  // ---- Ghi chú giới hạn ----
  const hint = el(
    'p',
    'bench__hint',
    'Lưu ý: đây là tải tính toán tổng hợp, không phải hình ảnh của phần mềm thật, nên điểm chỉ để so sánh trên cùng máy và cùng trình duyệt — đổi trình duyệt thì điểm có thể khác. Hãy giữ tab này ở chế độ tiếp nhận tiêu điểm trong lúc đo. Ở một số trình duyệt, nút “Dừng” có thể không phản ứng cho tới khi bạn đóng cửa sổ.',
  );

  root.append(intro, noticeEl, stressSection, benchSection, hint);
  container.append(root);

  // ================= Hàm phụ =================
  function addResultRow(parent: HTMLElement, label: string): HTMLElement {
    const row = el('div', 'bench__row');
    row.append(el('span', 'bench__row-label', label), el('span', 'bench__row-value', '—'));
    parent.append(row);
    return row.lastElementChild as HTMLElement;
  }

  function setValue(cell: HTMLElement, text: string): void {
    cell.textContent = text;
  }

  function setStressStatus(text: string): void {
    stressStatus.textContent = `Trạng thái: ${text}`;
  }

  function setBenchStatus(text: string): void {
    benchStatus.textContent = text;
  }

  function setProgress(pct: number): void {
    const value = Math.max(0, Math.min(100, Math.round(pct)));
    benchBarFill.style.width = `${value}%`;
    benchBar.setAttribute('aria-valuenow', String(value));
  }

  function setButtons(list: HTMLButtonElement[], disabled: boolean): void {
    for (const btn of list) btn.disabled = disabled;
  }

  function gpuNameOf(): string {
    if (gpuName === null) gpuName = detectGpuName();
    return gpuName;
  }

  function gpuCalculations(): number {
    return PARAM.gpuFrames * PARAM.gpuSize * PARAM.gpuSize * PARAM.gpuLoop;
  }

  // ================= Kiểm tra tải =================
  function stopStress(): void {
    for (const worker of stressWorkers) worker.terminate();
    stressWorkers = [];
    stopStorm = true;
    if (stormRaf) {
      cancelAnimationFrame(stormRaf);
      stormRaf = 0;
    }
    stormFallback?.renderer.dispose();
    stormFallback = null;
    if (elapsedTimer !== null) {
      window.clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
    setStressStatus('đã dừng');
    setButtons([btnStressGpu, btnStressCpu, btnStressBoth], false);
    btnStop.disabled = true;
  }

  function startElapsedTimer(): void {
    stressStartedAt = performance.now();
    if (elapsedTimer !== null) window.clearInterval(elapsedTimer);
    elapsedTimer = window.setInterval(() => {
      stressElapsed.textContent = `Thời gian: ${fmtElapsed(performance.now() - stressStartedAt)}`;
    }, 500);
  }

  /** Chạy shader trên tab chính (khi worker không dựng được WebGL2). */
  function startGpuStormFallback(): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = PARAM.gpuSize;
      canvas.height = PARAM.gpuSize;
      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('Thiếu WebGL2');
      const renderer = new GpuRenderer(gl, PARAM.gpuSize);
      renderer.setLoop(PARAM.gpuLoop);
      stormFallback = { canvas, renderer };
      stopStorm = false;
      setStressStatus('đang chạy (chạy ngay trên tab này)');
      const tick = (): void => {
        if (stopStorm || disposed) return;
        renderer.runFrame();
        stormRaf = requestAnimationFrame(tick);
      };
      stormRaf = requestAnimationFrame(tick);
    } catch {
      notice('Trình duyệt này không hỗ trợ WebGL2 nên không nạp được GPU.');
      setStressStatus('không hỗ trợ GPU');
    }
  }

  function startGpuStorm(): void {
    if (FORCE_MAIN_THREAD_GPU) {
      startGpuStormFallback();
      return;
    }
    const worker = new Worker(new URL('./gpu-worker.ts', import.meta.url), { type: 'module' });
    stressWorkers.push(worker);
    let failed = false;

    const fallback = (): void => {
      if (failed) return;
      failed = true;
      worker.terminate();
      stressWorkers = stressWorkers.filter((w) => w !== worker);
      startGpuStormFallback();
    };

    worker.onmessage = (e: MessageEvent<WorkerEvent>): void => {
      const msg = e.data;
      if (msg.ev === 'ready') setStressStatus('đang chạy');
      else if (msg.ev === 'error') fallback();
    };
    worker.onerror = (): void => fallback();
    worker.postMessage({ ev: 'storm', size: PARAM.gpuSize, loop: PARAM.gpuLoop });
  }

  function startCpuStorm(): void {
    const cores = cpuCores();
    for (let i = 0; i < cores; i++) {
      const worker = new Worker(new URL('./cpu-worker.ts', import.meta.url), { type: 'module' });
      stressWorkers.push(worker);
      worker.onmessage = (e: MessageEvent<WorkerEvent>): void => {
        if (e.data.ev === 'ready') setStressStatus(`đang chạy (${cores} luồng CPU)`);
      };
      worker.postMessage({ ev: 'storm' });
    }
  }

  function startStress(kind: 'gpu' | 'cpu' | 'both'): void {
    stopStress();
    setButtons([btnStressGpu, btnStressCpu, btnStressBoth], true);
    btnStop.disabled = false;
    setStressStatus('đang chuẩn bị…');
    stressElapsed.textContent = 'Thời gian: 0:00';
    startElapsedTimer();

    if (kind === 'gpu' || kind === 'both') startGpuStorm();
    if (kind === 'cpu' || kind === 'both') startCpuStorm();
  }

  // ================= Benchmark =================
  /** Dừng benchmark đang chạy: GPU benchmark có thể kéo dài vài chục giây. */
  function stopBench(): void {
    for (const worker of benchWorkers) worker.terminate();
    benchWorkers = [];
    benchCancelled = true;
    if (benchRaf) {
      cancelAnimationFrame(benchRaf);
      benchRaf = 0;
    }
    benchFallback?.renderer.dispose();
    benchFallback = null;
    setButtons([btnBenchGpu, btnBenchCpu], false);
    btnBenchStop.disabled = true;
    setBenchStatus('Đã dừng benchmark.');
  }

  function resetBench(): void {
    stopBench();
    setProgress(0);
    setValue(rowGpuScore, '—');
    setValue(rowGpuName, '—');
    setValue(rowCpuScore, '—');
    setValue(rowCpuSingle, '—');
    setValue(rowTotal, '—');
  }

  function finishBench(): void {
    setButtons([btnBenchGpu, btnBenchCpu], false);
    btnBenchStop.disabled = true;
  }

  function showGpuResult(score: number, totalMs: number): void {
    setValue(rowGpuScore, fmtScore(score));
    setValue(rowGpuName, gpuNameOf());
    setValue(rowTotal, fmtElapsed(totalMs));
    setValue(rowCores, String(cpuCores()));
    setProgress(100);
    setBenchStatus('Xong benchmark GPU.');
  }

  function showCpuResult(score: number, single: number, totalMs: number, cores: number): void {
    setValue(rowCpuScore, fmtScore(score));
    setValue(rowCpuSingle, fmtScore(single));
    setValue(rowTotal, fmtElapsed(totalMs));
    setValue(rowCores, String(cores));
    setProgress(100);
    setBenchStatus('Xong benchmark CPU.');
  }

  /** Benchmark GPU trên tab chính, chia nhỏ theo từng khung hình để không treo trình duyệt. */
  function runGpuBenchFallback(): void {
    let renderer: GpuRenderer;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = PARAM.gpuSize;
      canvas.height = PARAM.gpuSize;
      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('Thiếu WebGL2');
      renderer = new GpuRenderer(gl, PARAM.gpuSize);
      renderer.setLoop(PARAM.gpuLoop);
      benchFallback = { canvas, renderer };
    } catch {
      notice('Trình duyệt này không hỗ trợ WebGL2 nên không benchmark được GPU.');
      setBenchStatus('Không hỗ trợ GPU.');
      finishBench();
      return;
    }

    const frames = PARAM.gpuFrames;
    let done = 0;
    let startedAt = 0;
    benchCancelled = false;
    const tick = (): void => {
      if (benchCancelled || disposed) return;
      if (done === 0) startedAt = performance.now();
      renderer.runFrame();
      done++;
      setProgress((done / frames) * 100);
      if (done >= frames) {
        const ms = performance.now() - startedAt;
        showGpuResult(gpuCalculations() / (ms * 1000), ms);
        finishBench();
        return;
      }
      benchRaf = requestAnimationFrame(tick);
    };
    benchRaf = requestAnimationFrame(tick);
  }

  function runGpuBench(): void {
    resetBench();
    benchCancelled = false;
    setButtons([btnBenchGpu, btnBenchCpu], true);
    btnBenchStop.disabled = false;
    if (FORCE_MAIN_THREAD_GPU) {
      setBenchStatus('Đang đo GPU…');
      runGpuBenchFallback();
      return;
    }
    setBenchStatus('Đang đo GPU…');
    const startedAt = performance.now();
    const worker = new Worker(new URL('./gpu-worker.ts', import.meta.url), { type: 'module' });
    benchWorkers.push(worker);
    let failed = false;

    const fallback = (): void => {
      if (failed) return;
      failed = true;
      worker.terminate();
      benchWorkers = benchWorkers.filter((w) => w !== worker);
      runGpuBenchFallback();
    };

    worker.onmessage = (e: MessageEvent<WorkerEvent>): void => {
      const msg = e.data;
      if (msg.ev === 'ready') setBenchStatus('Đang đo GPU…');
      else if (msg.ev === 'progress') setProgress(msg.pct);
      else if (msg.ev === 'result') {
        showGpuResult(gpuCalculations() / (msg.ms * 1000), performance.now() - startedAt);
        finishBench();
      } else if (msg.ev === 'error') fallback();
    };
    worker.onerror = (): void => fallback();
    worker.postMessage({
      ev: 'bench',
      size: PARAM.gpuSize,
      loop: PARAM.gpuLoop,
      frames: PARAM.gpuFrames,
    });
  }

  function runCpuBench(): void {
    resetBench();
    benchCancelled = false;
    setButtons([btnBenchGpu, btnBenchCpu], true);
    btnBenchStop.disabled = false;
    setBenchStatus('Đang đo CPU…');
    const startedAt = performance.now();
    const cores = cpuCores();
    const times: number[] = [];
    let progressSum = 0;
    let broken = false;

    for (let i = 0; i < cores; i++) {
      const worker = new Worker(new URL('./cpu-worker.ts', import.meta.url), { type: 'module' });
      benchWorkers.push(worker);
      const onBroken = (): void => {
        if (broken) return;
        broken = true;
        notice('Một worker CPU bị lỗi nên đã dừng benchmark.');
        stopBench();
      };
      worker.onmessage = (e: MessageEvent<WorkerEvent>): void => {
        const msg = e.data;
        if (msg.ev === 'ready') setBenchStatus(`Đang đo CPU (${cores} luồng)…`);
        else if (msg.ev === 'progress') {
          progressSum += msg.pct / cores;
          setProgress(progressSum);
        } else if (msg.ev === 'result') {
          times.push(msg.ms);
          if (times.length === cores) {
            let multi = 0;
            for (const ms of times) multi += PARAM.cpuIters / (ms * 1000);
            showCpuResult(multi, Math.floor(multi) / cores, performance.now() - startedAt, cores);
            finishBench();
          }
        } else if (msg.ev === 'error') onBroken();
      };
      worker.onerror = (): void => onBroken();
      worker.postMessage({ ev: 'bench', iters: PARAM.cpuIters });
    }
  }

  // ================= Sự kiện =================
  btnStressGpu.addEventListener('click', () => startStress('gpu'));
  btnStressCpu.addEventListener('click', () => startStress('cpu'));
  btnStressBoth.addEventListener('click', () => startStress('both'));
  btnStop.addEventListener('click', () => stopStress());
  btnBenchGpu.addEventListener('click', () => runGpuBench());
  btnBenchCpu.addEventListener('click', () => runCpuBench());
  btnBenchStop.addEventListener('click', () => stopBench());

  // ================= Dọn dẹp =================
  return () => {
    disposed = true;
    stopStorm = true;
    benchCancelled = true;
    if (stormRaf) {
      cancelAnimationFrame(stormRaf);
      stormRaf = 0;
    }
    if (benchRaf) {
      cancelAnimationFrame(benchRaf);
      benchRaf = 0;
    }
    stormFallback?.renderer.dispose();
    stormFallback = null;
    benchFallback?.renderer.dispose();
    benchFallback = null;
    for (const worker of [...stressWorkers, ...benchWorkers]) worker.terminate();
    stressWorkers = [];
    benchWorkers = [];
    if (elapsedTimer !== null) {
      window.clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
    root.remove();
  };
}
