---
name: camera-mic-tester
description: Xây bài kiểm tra camera và microphone bằng getUserMedia, xin quyền, xem trước, đo mức âm, ghi âm thử. Dùng khi tạo hoặc sửa module camera hoặc microphone, xử lý quyền truy cập thiết bị.
---

# Bài kiểm tra camera và microphone

## Khi nào dùng
Khi làm việc với `src/modules/camera/` và `src/modules/microphone/`. Cần HTTPS (GitHub Pages có sẵn) hoặc `localhost`.

## Quy tắc chung
- Chỉ xin quyền khi người dùng bấm nút "Bật camera" hoặc "Bật micro", không xin khi tải trang.
- Dùng `navigator.mediaDevices?.getUserMedia`; không có thì hiện thông báo "trình duyệt không hỗ trợ".
- Phân loại lỗi theo `error.name`: `NotAllowedError` (bị từ chối: hướng dẫn mở lại quyền cho Chrome, Edge, Safari, Firefox), `NotFoundError` (không có thiết bị), `NotReadableError` (đang bị ứng dụng khác dùng), `OverconstrainedError` (thử lại không ràng buộc).
- Danh sách thiết bị: `enumerateDevices()` chỉ có tên thiết bị sau khi đã cấp quyền; gọi lại sau khi có quyền. Cho chọn thiết bị bằng `deviceId: { exact }`.
- Dừng mọi track (`stream.getTracks().forEach(t => t.stop())`) khi bấm "Tắt", khi rời bài kiểm tra và khi `pagehide`, để tắt đèn camera.
- Không bao giờ tải dữ liệu lên máy chủ; ảnh và âm thanh chỉ ở trong bộ nhớ trang.

## Camera
- `<video autoplay playsinline muted>` (bắt buộc `playsinline` cho iOS).
- Hiện độ phân giải và số khung hình/giây thực tế từ `track.getSettings()` (`width`, `height`, `frameRate`).
- Công tắc lật gương (CSS `transform: scaleX(-1)`, không đổi luồng gốc).
- "Chụp thử": vẽ khung hình vào `<canvas>`, hiện ảnh; nút tải về tùy chọn.

## Microphone
- `AudioContext` + `createMediaStreamSource` + `AnalyserNode` (`fftSize` 2048); không nối vào `destination` để tránh hú.
- Mức âm: RMS từ `getFloatTimeDomainData`, đổi sang dB (`20 * log10(rms)`); vẽ thanh mức và dạng sóng bằng canvas qua `requestAnimationFrame`.
- Báo "quá nhỏ" khi dưới khoảng −50 dBFS khi người dùng đang nói, "bị vỡ tiếng" khi đỉnh chạm 0 dBFS.
- Ghi âm thử 5 giây bằng `MediaRecorder` rồi phát lại qua `<audio>` dùng `URL.createObjectURL`; thu hồi bằng `URL.revokeObjectURL`. Chọn `mimeType` bằng `MediaRecorder.isTypeSupported` (Safari không hỗ trợ webm).
- Công tắc `echoCancellation`, `noiseSuppression`, `autoGainControl` để so sánh chất lượng thu.
- Cảnh báo dùng tai nghe khi phát lại để tránh hú.

## Xác nhận kết quả
Hỏi "Hình ảnh / âm thanh có bình thường không?" rồi ghi Đạt / Chưa đạt vào bảng tổng hợp.

## Kiểm tra trước khi xong
- Từ chối quyền rồi cấp lại: giao diện hồi phục.
- Rút camera/micro khi đang chạy: không báo lỗi khó hiểu.
- Sau khi tắt, đèn camera tắt.
