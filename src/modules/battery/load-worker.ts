// Worker tạo tải CPU để xả pin nhanh hơn: lặp vô hạn dải toán số học có phụ thuộc
// (giống cách module bench làm) nên không thể bị tối ưu hoá thành vòng lặp rỗng.
// Main thread tự terminate khi dừng, không cần thông báo kết thúc.
export {};

interface LoadMsg {
  ev: 'storm';
}

/** postMessage của DedicatedWorkerGlobalScope; Window.postMessage kiểu DOM đòi thêm tham số. */
const post = (m: unknown): void => (self as unknown as Worker).postMessage(m);

/**
 * Một bước dải toán: lấy dư với hằng số cố định, chia, exp rồi 6 lần căn bậc hai.
 * Giá trị được giữ trong khoảng [0, 1) để không tràn số.
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

self.onmessage = (e: MessageEvent<LoadMsg>): void => {
  if (e.data.ev !== 'storm') return;
  post({ ev: 'ready' });
  let n = 0;
  for (;;) {
    n = n >= 1e8 ? 1 : n + 1;
    sink += chain(Math.abs(Math.sin(n)) + n / 1e8);
  }
};
