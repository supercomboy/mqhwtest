---
name: keyboard-tester
description: Xây bài kiểm tra bàn phím chuẩn US ANSI cho PC (đầy đủ) và laptop (không có phím số). Dùng khi tạo hoặc sửa module keyboard, bố cục phím, nhận diện phím, cảnh báo layout không phải US.
---

# Bài kiểm tra bàn phím (US ANSI)

## Khi nào dùng
Khi làm việc với `src/modules/keyboard/`. Kết hợp với skill `apple-brown-design` cho giao diện.

## Cấu trúc đề xuất
- `layout.ts`: dữ liệu bố cục dạng mảng hàng, mỗi phím `{ code, label, width }` (width theo đơn vị 1u = 1 phím chữ).
- `keyboard.ts`: lắng nghe sự kiện, giữ `Set<string>` các phím đã nhấn, cập nhật giao diện.
- `detect.ts`: phát hiện layout hệ thống và bàn phím ISO.

## Nhận diện phím
- Dùng `event.code` (vị trí vật lý) để đánh dấu phím, không dùng `event.key` hay `keyCode` (đã lỗi thời). `event.key` chỉ để hiển thị ký tự.
- Phân biệt trái/phải: `ShiftLeft`/`ShiftRight`, `ControlLeft`/`ControlRight`, `AltLeft`/`AltRight`, `Enter`/`NumpadEnter`.
- Gọi `event.preventDefault()` cho phím có hành vi mặc định (Tab, F1–F12 trừ F11 nếu cần, mũi tên, Space, Backspace, Alt) khi bài kiểm tra đang mở, để trang không cuộn hay tải lại.
- Caps Lock, Num Lock, Scroll Lock: đọc bằng `event.getModifierState('CapsLock')` vì là phím bật/tắt.
- PrintScreen trên Windows chỉ phát `keyup`: xử lý cả `keydown` và `keyup`.

## Hai chế độ bố cục
- PC (khoảng 104 phím): hàng Esc/F1–F12, cụm Insert/Home/PageUp/Delete/End/PageDown, mũi tên, bàn phím số (`Numpad0`–`Numpad9`, `NumpadAdd`, `NumpadSubtract`, `NumpadMultiply`, `NumpadDivide`, `NumpadDecimal`, `NumpadEnter`, `NumLock`).
- Laptop: bỏ bàn phím số; công tắc chuyển chế độ, tự gợi ý theo kích thước màn hình.
- Hàng chính US ANSI: `Backquote, Digit1–Digit0, Minus, Equal, Backspace` / `Tab, KeyQ…KeyP, BracketLeft, BracketRight, Backslash` / `CapsLock, KeyA…KeyL, Semicolon, Quote, Enter` / `ShiftLeft, KeyZ…KeyM, Comma, Period, Slash, ShiftRight` / `ControlLeft, MetaLeft, AltLeft, Space, AltRight, MetaRight, ContextMenu, ControlRight`.

## Kiểm tra "chuẩn US"
1. Nếu có `navigator.keyboard?.getLayoutMap` (Chrome/Edge): `const map = await navigator.keyboard.getLayoutMap()`; layout US khi `map.get('KeyQ') === 'q'`, `map.get('KeyA') === 'a'`, `map.get('KeyZ') === 'z'`, `map.get('Backquote') === '`'`, `map.get('Backslash') === '\\'`. Sai thì cảnh báo "layout hệ thống không phải US".
2. Nhận được `IntlBackslash`, `IntlRo` hoặc `IntlYen` nghĩa là bàn phím ISO/JIS: cảnh báo "bàn phím này không phải ANSI US" (Enter hình chữ L, có phím thừa cạnh Shift trái).
3. Trình duyệt không có `getLayoutMap`: yêu cầu gõ một dòng mẫu chứa đủ `` ~ ! @ # $ % ^ & * ( ) _ + { } | : " < > ? `` và so khớp từng ký tự.

## Phím không bắt được
Fn, một số phím media/độ sáng, phím Windows/Cmd, Alt+Tab có thể bị hệ điều hành giữ. Đánh dấu "không áp dụng", cho phép bỏ qua, không tính là lỗi.

## Tính năng bổ sung
- Nhật ký phím gần nhất (code, key, thời gian).
- Phát hiện kẹt phím: `keydown` lặp kéo dài (`event.repeat`) mà không có `keyup`.
- Đếm số phím đang giữ cùng lúc (thử n-key rollover).
- Nút "Đặt lại", đếm đã kiểm tra / tổng, thông báo hoàn thành.

## Kiểm tra trước khi xong
- Nhấn từng phím: đúng phím sáng, không trùng phím trái/phải.
- Đổi sang bộ gõ tiếng Việt: vẫn đánh dấu đúng (nhờ `code`).
- Không có phím nào làm trang cuộn, tải lại hay mở menu của trình duyệt.
