---
name: speaker-tester
description: Xây bài kiểm tra loa với 2 file mp3 có sẵn, cân bằng trái/phải, chọn thiết bị phát. Dùng khi tạo hoặc sửa module speaker, trình phát âm thanh, âm thử kênh trái phải.
---

# Bài kiểm tra loa

## Khi nào dùng
Khi làm việc với `src/modules/speaker/`. Hai file mp3 nằm ở `public/audio/` (xem `public/audio/README.md`).

## Dữ liệu
- `tracks.ts` khai báo `{ id, title, description, file }`; đường dẫn file dựng bằng `import.meta.env.BASE_URL + 'audio/' + file` (không dùng đường dẫn tuyệt đối `/audio/...`, vì site chạy trong thư mục con của GitHub Pages).
- Nếu chưa biết nội dung 2 file, hỏi người dùng (nhạc mẫu, giọng đọc, âm trái/phải, âm bass) trước khi đặt tên và mô tả.

## Trình phát
- Mỗi file một thẻ: Phát/Tạm dừng, thanh tiến trình, thanh âm lượng. Dùng `HTMLAudioElement` với `preload="none"`.
- Trình duyệt chặn tự phát: chỉ gọi `play()` trong sự kiện bấm của người dùng; bắt lỗi của `play()` và hiện thông báo thân thiện.
- Tạo `AudioContext` khi người dùng bấm lần đầu (hoặc gọi `resume()`).

## Kiểm tra trái/phải
- Nối `MediaElementAudioSourceNode` → `StereoPannerNode` → `destination`; ba nút "Chỉ loa trái" (pan −1), "Chỉ loa phải" (+1), "Cả hai" (0).
- Mỗi `HTMLAudioElement` chỉ được tạo `MediaElementSource` một lần: giữ node trong bộ nhớ, đừng tạo lại.
- Nếu file là mono, hoặc muốn kiểm tra không phụ thuộc file: sinh âm thử bằng `OscillatorNode` 440 Hz qua `StereoPannerNode`, mỗi kênh vài giây, biên độ nhỏ (gain ≤ 0.2).

## Chọn thiết bị phát
Chỉ khi `'setSinkId' in HTMLMediaElement.prototype` (Chrome/Edge): liệt kê `enumerateDevices()` loại `audiooutput` rồi gọi `audio.setSinkId(deviceId)`. Trình duyệt khác thì ẩn mục này.

## Xác nhận kết quả
Sau khi phát hỏi "Bạn có nghe rõ cả hai bên không?" với các lựa chọn: Rõ / Rè hoặc nhỏ / Mất một bên / Không nghe thấy. Lưu kết quả vào bảng tổng hợp. Khi không nghe: gợi ý kiểm tra âm lượng hệ thống, thiết bị phát đang chọn, cắm lại tai nghe.

## Kiểm tra trước khi xong
- Âm lượng mặc định vừa phải (không bất ngờ to).
- Rời bài kiểm tra thì dừng âm thanh.
- Chạy được trên Safari (không có `setSinkId`) mà không lỗi.
