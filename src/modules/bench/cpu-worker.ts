// Worker CPU: chạy dải toán số học song song của mprep.info/gpu — nhốt trong worker nên
// không đóng băng giao diện. Chế độ "storm" lặp vô hạn (kiểm tra tải), chế độ "bench" chạy
// số vòng cố định rồi báo số mili-giây đã tiêu (tính điểm).

interface StormMsg {
  ev: 'storm';
}

interface BenchMsg {
  ev: 'bench';
  iters: number;
}

type InMsg = StormMsg | BenchMsg;

/** postMessage của DedicatedWorkerGlobalScope; Window.postMessage kiểu DOM đòi thêm tham số. */
const post = (m: unknown): void => (self as unknown as Worker).postMessage(m);

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : String(err);
}

/**
 * Một bước của dải toán: lấy dư với hằng số cố định, chia, exp rồi 6 lần căn bậc hai —
 * cùng hỗn hợp phép tính với kernel của mprep. Giá trị được đưa về khoảng [0, 1) để không
 * tràn số (mprep để exp tràn vô hạn sau vài vòng).
 */
function chain(seed: number): number {
  let s = (5458700 * seed) % 54687 * ((6847648 * seed) % 68648) - 98468 * (seed % 513684);
  s = (s % 9769864) / 9769864;
  s = Math.exp(s);
  for (let i = 0; i < 6; i++) s = Math.sqrt(s);
  return s;
}

/** Kết quả cuối cùng được giữ lại để trình biên dịch không bỏ vòng lặp. */
let sink = 0;

self.onmessage = (e: MessageEvent<InMsg>): void => {
  const msg = e.data;
  try {
    if (msg.ev === 'storm') {
      post({ ev: 'ready' });
      let n = 0;
      for (;;) {
        n = n >= 1e8 ? 1 : n + 1;
        sink += chain(Math.abs(Math.sin(n)) + n / 1e8);
      }
      return;
    }

    const iters = Math.max(1, Math.floor(msg.iters));
    post({ ev: 'ready' });
    // Hạt giống cố định, mỗi vòng lấy kết quả vòng trước làm đầu vào: vòng lặp có phụ thuộc
    // nên không thể bị tối ưu hoá thành vòng lặp rỗng.
    let s = chain(Math.random());
    const report = Math.max(1, Math.floor(iters / 100));
    const t0 = performance.now();
    for (let i = 1; i <= iters; i++) {
      s = chain(s);
      sink += s;
      if (i % report === 0) post({ ev: 'progress', pct: Math.round((i / iters) * 100) });
    }
    post({ ev: 'result', ms: performance.now() - t0, out: s });
  } catch (err) {
    post({ ev: 'error', message: errorName(err) });
  }
};
