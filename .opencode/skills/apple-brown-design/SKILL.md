---
name: apple-brown-design
description: Quy tắc giao diện kiểu Apple với chữ nâu nhạt cho Device Check. Dùng khi tạo hoặc sửa bất kỳ giao diện, CSS, thành phần hay bố cục nào của website.
---

# Giao diện kiểu Apple, chữ nâu nhạt

## Khi nào dùng
Mọi lúc viết HTML/CSS hoặc thành phần giao diện. Đọc `src/styles/tokens.css` trước.

## Nguyên tắc
- Nền trắng ngà, nhiều khoảng trống, tiêu đề lớn, chữ đậm vừa (600), bo góc lớn, bóng mềm, chuyển động nhẹ.
- Toàn bộ chữ dùng nâu nhạt, không dùng đen. Chữ chính `--text` (#7A5C45, tương phản ~5.9:1, đạt WCAG AA). Chữ phụ `--text-soft` (#A68A73, ~3:1) chỉ cho chữ từ 18px trở lên hoặc phần trang trí, không dùng cho chú thích nhỏ.
- Nút chính: nền `--accent`, chữ `--accent-text`, bo tròn hoàn toàn (980px). Nút phụ: viền `--accent`, nền trong suốt.
- Đạt/lỗi dùng `--ok` và `--bad`, luôn kèm biểu tượng hoặc chữ, không chỉ dựa vào màu.

## Quy tắc kỹ thuật
- Chỉ dùng biến CSS trong `tokens.css`; muốn thêm màu thì thêm token (cả bản sáng và tối) rồi dùng.
- Font: `var(--font)` (SF Pro trên máy Apple, Inter hoặc font hệ thống nơi khác). Nội dung 17px, tiêu đề dùng `clamp()`.
- Thẻ: `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-card)`, nền `--surface`.
- Thanh menu: dính trên cùng, `backdrop-filter: saturate(180%) blur(20px)`.
- Chuyển động: 300–500 ms, `var(--ease)`, chỉ animate `opacity` và `transform`. Bắt buộc có nhánh `@media (prefers-reduced-motion: reduce)` tắt chuyển động.
- Dark mode: nền `#1D1B19`, chữ `#D9C3AE`, đã có trong tokens (theo hệ thống, ghi đè bằng `data-theme`).
- Responsive: bắt đầu từ điện thoại (rộng 360px), lề 16px, lưới `auto-fit`, không để cuộn ngang trang.
- Truy cập: mọi điều khiển dùng được bằng bàn phím, có `:focus-visible` rõ ràng, nút có nhãn chữ, vùng bấm tối thiểu 44×44px.

## Kiểm tra trước khi xong
1. Không còn mã màu `#...` ngoài `tokens.css`.
2. Mở ở rộng 360px và 1440px, sáng và tối.
3. Tab qua mọi điều khiển được.
