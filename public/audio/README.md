# Thư mục chứa file mp3 kiểm tra loa

Ba file đang dùng, khai báo trong `src/modules/speaker/tracks.ts`:

| File | Thẻ hiển thị | Dung lượng |
| --- | --- | --- |
| `speaker-sweep.mp3` | Dải trầm và bổng | ~0,44 MB |
| `speaker-test-1.mp3` | Bản nhạc 2 | ~1,7 MB |
| `speaker-test-2.mp3` | Bản nhạc 3 | ~3,8 MB |

## File quét dải `speaker-sweep.mp3`

File được tạo bằng script (không nằm trong repo, chỉ cần khi muốn tạo lại):

- Mono, 44 100 Hz, MP3 128 kbps, đỉnh −10,5 dBFS, dài 27,5 giây.
- Các đoạn, mỗi đoạn cách nhau 0,5 giây im lặng, fade 25 ms ở hai đầu:

| Mốc | Nội dung | Biên độ |
| --- | --- | --- |
| 0:00 | Âm chuẩn 1 kHz, 2 giây | 0,42 |
| 0:02,5 | Quét dải trầm 200 → 30 Hz, 12 giây | 0,95 |
| 0:15 | Quét dải bổng 2 000 → 16 000 Hz, 8 giây | 0,60 |
| 0:23,5 | Giữ 40 Hz (tiếng ù), 4 giây | 1,00 |

Quét theo thang logarit (`f0 * (f1/f0)^(t/T)`), cộng dồn pha để không bị lệch tần số. Các mốc này cũng được khai báo trong `segments` của `tracks.ts` để thẻ phát hiện đúng đoạn đang nghe.

Muốn tạo lại: dùng Node với `@breezystack/lamejs` (`new Mp3Encoder(1, 44100, 128)`, ghi từng khối 1152 mẫu PCM16) — không cần ffmpeg.

## Thêm file mới

Chép file vào đây rồi khai báo thêm một mục `{ id, title, description, file }` trong `tracks.ts`. Tên file chỉ dùng chữ thường, số và dấu gạch nối (tên có dấu cách làm Vite watcher báo `EBUSY` và tắt dev server).

Nên giữ mỗi file dưới 2 MB để trang tải nhanh trên GitHub Pages (file thứ ba hiện ~3,8 MB: vẫn dưới giới hạn 100 MB của GitHub, nhưng làm repo nặng hơn). Trình phát dùng `preload="none"` nên chỉ tải khi người dùng bấm “Phát”.
