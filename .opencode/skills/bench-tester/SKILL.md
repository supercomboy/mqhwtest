---
name: bench-tester
description: Bài kiểm tra CPU & GPU: kiểm tra tải (stress) và benchmark bằng WebGL2 + Web Worker, điểm số phép tính/µs. Dùng khi tạo hoặc sửa module bench.
---

# Bài kiểm tra CPU & GPU

## Khi nào dùng
Khi làm việc với `src/modules/bench/`.

## Kiến trúc
- `bench.ts` — giao diện + điều phối (mount/cleanup), fallback chạy GPU trên tab chính.
- `gpu-gl.ts` — shader WebGL2 + lớp `GpuRenderer` dùng chung cho worker và fallback.
- `gpu-worker.ts` — OffscreenCanvas + WebGL2 trong worker (storm vô hạn, bench đo N khung).
- `cpu-worker.ts` — dải toán số học trong worker (storm vô hạn, bench đo số vòng cố định).
- Worker tạo bằng `new Worker(new URL('./gpu-worker.ts', import.meta.url), { type: 'module' })` (Vite tự đóng gói).

## Công thức (port từ kernel gpu.js của mprep.info/gpu — tự viết, không nhúng gpu.js)
- Shader mỗi texel: `t += mod(tid,5466587)*mod(tid,6847648) - mod(tid,51374684); t = t/mod(tid,9769864)*6541; t = exp(t); t = 6×sqrt(t);` — giá trị vòng sau phụ thuộc vòng trước nên không bị tối ưu rỗng.
- GPU: vùng vẽ 1000×1000 (1e6 texel), mỗi texel 10000 vòng, đo 400 khung hình → tổng `4e12` phép tính. Điểm = `4e12 / ms / 1000` (phép tính/µs).
- CPU: mỗi worker (`navigator.hardwareConcurrency`, tối đa 32) chạy `5e7` vòng dải toán. Điểm đa luồng = `Σ(iters/ms/1000)`; điểm đơn luồng = `floor(đa luồng) / số luồng`.
  - Lệch so với mprep: mprep dùng `1e10` vòng/worker (chạy vài phút), bản này dùng `5e7` (khoảng 10–15 giây) để người dùng không phải chờ quá lâu → điểm KHÔNG so sánh được với bảng của mprep.

## Quy tắc bắt buộc
- Vòng lặp phải có phụ thuộc (kết quả vòng trước làm đầu vào vòng sau) và giá trị phải được đưa về khoảng [0,1) để `exp` không tràn thành Infinity/NaN; luôn ghi kết quả ra biến/ngoài để trình biên dịch không xoá vòng lặp.
- GPU: sau `drawArrays` phải `readPixels` để buộc GPU hoàn tất việc tính trước khi đo thời gian.
- Nếu worker không dựng được WebGL2 → tự chuyển sang chạy shader trên tab chính (chia theo `requestAnimationFrame` để vẫn dừng được), không được để trang lỗi.
- Luôn `worker.terminate()` mọi worker, `cancelAnimationFrame`, `clearInterval` khi rời bài kiểm tra.
- Chữ trong giao diện tiếng Việt; màu/bo góc chỉ lấy từ `src/styles/tokens.css`.

## Kiểm thử nhanh
- Tham số `?quick` trên URL (chỉ dùng cho kiểm tra tự động, không phải điểm số thật): GPU 200×200 / 64 vòng / 8 khung, CPU 2e6 vòng.
- Tham số `?mainthread=1`: ép chạy GPU trên tab chính để kiểm tra đường dự phòng (dùng khi trình duyệt không có WebGL trong worker).
- Kiểm tra bằng Chrome headless + CDP: mở `[data-module="bench"]`, bấm “Benchmark CPU” (điểm > 0), “Benchmark GPU” (điểm > 0), “Nạp CPU” rồi “Dừng”, “Nạp GPU” rồi “Dừng”; kiểm tra không có lỗi console và không tràn ngang.
- Trình duyệt thứ hai: Firefox dùng WebDriver BiDi (`--remote-debugging-port`, endpoint `ws://127.0.0.1:<port>/session`, không có route `/json/version` như CDP).
- Bắt buộc chạy `npm run build` trước khi báo xong.
