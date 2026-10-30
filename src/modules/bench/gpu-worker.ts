// Worker GPU: chạy shader WebGL2 trên OffscreenCanvas nên giao diện không bị treo.
// Chế độ "storm" vẽ liên tục không ngừng (kiểm tra tải), chế độ "bench" đo thời gian của
// một chuỗi khung hình (tính điểm).

import { GpuRenderer } from './gpu-gl';

interface StormMsg {
  ev: 'storm';
  size: number;
  loop: number;
}

interface BenchMsg {
  ev: 'bench';
  size: number;
  loop: number;
  frames: number;
}

type InMsg = StormMsg | BenchMsg;

/** postMessage của DedicatedWorkerGlobalScope; Window.postMessage kiểu DOM đòi thêm tham số. */
const post = (m: unknown): void => (self as unknown as Worker).postMessage(m);

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : String(err);
}

function createRenderer(size: number): GpuRenderer {
  const canvas = new OffscreenCanvas(size, size);
  const gl = canvas.getContext('webgl2') as unknown as WebGL2RenderingContext | null;
  if (!gl) throw new Error('Không lấy được ngữ cảnh WebGL2 trong worker');
  return new GpuRenderer(gl, size);
}

self.onmessage = (e: MessageEvent<InMsg>): void => {
  const msg = e.data;
  try {
    if (msg.ev === 'storm') {
      const renderer = createRenderer(msg.size);
      renderer.setLoop(msg.loop);
      post({ ev: 'ready' });
      // Vòng lặp vô hạn: chỉ dừng được khi worker bị terminate từ tab chính.
      for (;;) renderer.runFrame();
      return;
    }

    const renderer = createRenderer(msg.size);
    renderer.setLoop(msg.loop);
    post({ ev: 'ready' });
    // Khung hình "nóng" không tính vào kết quả, giống gpu.js (lần gọi kernel đầu tiên).
    renderer.runFrame();
    const t0 = performance.now();
    for (let frame = 1; frame <= msg.frames; frame++) {
      renderer.runFrame();
      post({ ev: 'progress', pct: Math.round((frame / msg.frames) * 100) });
    }
    post({ ev: 'result', ms: performance.now() - t0 });
  } catch (err) {
    post({ ev: 'error', message: errorName(err) });
  }
};
