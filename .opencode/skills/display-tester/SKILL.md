---
name: display-tester
description: Xây bài kiểm tra màn hình toàn màn hình với màu thuần, màn hình đen, dải xám, lưới, chữ và khối chuyển động, cùng thông tin hiển thị. Dùng khi tạo hoặc sửa module display.
---

# Bài kiểm tra màn hình

## Khi nào dùng
Khi làm việc với `src/modules/display/`.

## Các bài kiểm tra (mỗi bài là một "slide" toàn màn hình)
| Bài | Nội dung | Phát hiện |
| --- | --- | --- |
| Màu thuần | đỏ, xanh lá, xanh dương, trắng, đen, xám 50% | điểm chết, điểm sáng kẹt, ám màu |
| Màn hình đen | toàn đen | rò sáng viền, vùng sáng không đều (xem khi tắt đèn phòng) |
| Dải xám | gradient 0–255 có vạch bậc | sọc bậc (banding), mất chi tiết vùng tối/sáng |
| Lưới và hình tròn | lưới ô vuông, vòng tròn, đường chéo | méo hình, lệch tỷ lệ |
| Chữ và độ nét | chữ nhỏ trắng trên đen và ngược lại | mờ chữ, lỗi scale |
| Chuyển động | khối vuông chạy ngang tốc độ cố định | bóng mờ (ghosting), giật hình |

## Điều khiển
- Nút "Bắt đầu" gọi `element.requestFullscreen()` (phải trong sự kiện bấm). Space, Enter hoặc nhấp: bài tiếp; mũi tên trái: bài trước; Esc: thoát. Hiện số bài ("3/12") mờ ở góc, tự ẩn sau vài giây.
- Dùng `fullscreenchange` để dọn dẹp khi thoát.
- iPhone Safari không có Fullscreen API cho phần tử thường: dùng lớp phủ kín khung nhìn (`position: fixed; inset: 0; height: 100dvh`) thay thế và hướng dẫn "Thêm vào Màn hình chính" nếu cần.
- Vẽ họa tiết bằng canvas hoặc CSS thuần; canvas đặt kích thước theo `devicePixelRatio` để từng pixel vật lý được tô đúng (không làm mờ).
- Khi bật bài tối (đen, dải xám), dùng màu thuần không dùng token giao diện.

## Thông tin hiển thị
- Độ phân giải CSS: `screen.width × screen.height`; vật lý ước tính: nhân `devicePixelRatio` (ghi chú "ước tính").
- `screen.colorDepth`; dải màu rộng `matchMedia('(color-gamut: p3)')`; HDR `matchMedia('(dynamic-range: high)')`.
- Tần số quét ước tính: đếm khung hình `requestAnimationFrame` trong 2 giây, làm tròn, ghi "giá trị ước tính" (trình duyệt có thể giới hạn tần số khi tiết kiệm pin).

## Kiểm tra trước khi xong
- Thoát bằng Esc ở mọi bài, không kẹt toàn màn hình.
- Không có phần tử giao diện nào lẫn vào bài màu thuần (kể cả thanh cuộn, viền).
- Chuyển động mượt, dùng `transform`, không dùng `left`.
