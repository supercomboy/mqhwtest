# Thư mục chứa file mp3 kiểm tra loa

Ba bản nhạc đang dùng, khai báo trong `src/modules/speaker/tracks.ts`:

| File | Thẻ hiển thị | Dung lượng |
| --- | --- | --- |
| `speaker-test.mp3` | Bản nhạc 1 | ~0,4 MB |
| `speaker-test-1.mp3` | Bản nhạc 2 | ~1,6 MB |
| `speaker-test-2.mp3` | Bản nhạc 3 | ~3,8 MB |

Thêm bản mới: chép file vào đây rồi khai báo thêm một mục `{ id, title, description, file }` trong `tracks.ts`. Tên file chỉ dùng chữ thường, số và dấu gạch nối.

Nên giữ mỗi file dưới 2 MB để trang tải nhanh trên GitHub Pages (file thứ ba hiện ~3,8 MB: vẫn dưới giới hạn 100 MB của GitHub, nhưng làm repo nặng hơn). Trình phát dùng `preload="none"` nên chỉ tải khi người dùng bấm “Phát”.
