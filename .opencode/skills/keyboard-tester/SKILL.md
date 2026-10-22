---
name: keyboard-tester
description: Xây bài kiểm tra bàn phím chuẩn US ANSI cho PC (đầy đủ) và MacBook. Dùng khi tạo hoặc sửa module keyboard, bố cục phím, nhận diện phím, cảnh báo layout không phải US.
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
- PC (khoảng 104 phím, 23u): hàng Esc/F1–F12, cụm Insert/Home/PageUp/Delete/End/PageDown, mũi tên, bàn phím số (`Numpad0`–`Numpad9`, `NumpadAdd`, `NumpadSubtract`, `NumpadMultiply`, `NumpadDivide`, `NumpadDecimal`, `NumpadEnter`, `NumLock`).
- MacBook (14,5u): không có bàn phím số, không có cụm điều hướng và không có cột giữa — mũi tên nằm ngay cuối hàng dưới. Hàng dưới: `fn · control · option · ⌘ command · space · ⌘ command · option · ← · ▲▼ · →`.
- Khác biệt bề rộng so với PC, khai báo bằng `widthMac` trong `layout.ts`: Backspace 1,5u, Enter 1,75u, Shift trái 2u, Shift phải 2,5u, `\` 1u, khoảng trống đầu hàng F 0,5u. Mọi hàng Mac vẫn phải cộng đúng 14,5u để mép phải thẳng.
- Phím chỉ có ở một chế độ đánh dấu `mode: 'pc' | 'mac'`; CSS ẩn phần của chế độ còn lại (`.kb-key--pc-only`, `.kb-key--mac-only`), nhờ vậy hai hàng dưới dùng chung một lưới.
- Phím `fn` là `decor: true`: có thật trên máy nhưng trình duyệt không báo sự kiện, nên chỉ vẽ (nét đứt, mờ) và không tính vào tổng phím.
- Cụm ▲/▼ dùng `stack: [ArrowUp, ArrowDown]`: một ô 1u chứa hai phím nửa chiều cao.
- Một `event.code` có thể ứng với nhiều phần tử (mũi tên ở cụm giữa của PC và ở hàng dưới của MacBook), nên sổ đăng ký phím phải là `Map<string, HTMLElement[]>`.
- Công tắc chuyển chế độ; mặc định chọn MacBook khi cửa sổ hẹp (< 900px).
- Hàng chính US ANSI: `Backquote, Digit1–Digit0, Minus, Equal, Backspace` / `Tab, KeyQ…KeyP, BracketLeft, BracketRight, Backslash` / `CapsLock, KeyA…KeyL, Semicolon, Quote, Enter` / `ShiftLeft, KeyZ…KeyM, Comma, Period, Slash, ShiftRight` / `ControlLeft, MetaLeft, AltLeft, Space, AltRight, MetaRight, ContextMenu, ControlRight` (hàng cuối là của PC).

## Kiểm tra "chuẩn US"
1. Nếu có `navigator.keyboard?.getLayoutMap` (Chrome/Edge): `const map = await navigator.keyboard.getLayoutMap()`; layout US khi `map.get('KeyQ') === 'q'`, `map.get('KeyA') === 'a'`, `map.get('KeyZ') === 'z'`, `map.get('Backquote') === '`'`, `map.get('Backslash') === '\\'`. Sai thì cảnh báo "layout hệ thống không phải US".
2. Nhận được `IntlBackslash`, `IntlRo` hoặc `IntlYen` nghĩa là bàn phím ISO/JIS: cảnh báo "bàn phím này không phải ANSI US" (Enter hình chữ L, có phím thừa cạnh Shift trái).
3. Trình duyệt không có `getLayoutMap`: yêu cầu gõ một dòng mẫu chứa đủ `` ~ ! @ # $ % ^ & * ( ) _ + { } | : " < > ? `` và so khớp từng ký tự.

## Phím không bắt được
Fn, một số phím media/độ sáng, phím Windows/Cmd, Alt+Tab có thể bị hệ điều hành giữ. Đánh dấu "không áp dụng", cho phép bỏ qua, không tính là lỗi.

## Chặn phím tắt của trình duyệt
Bài kiểm tra chỉ có ích khi phím tắt không kéo theo hành vi của trình duyệt. `shouldPrevent(e)` trong `keyboard.ts` quyết định gọi `e.preventDefault()`, và việc ghi nhận phím vẫn chạy độc lập (phím bị chặn vẫn được tính):

1. `FUNCTION_KEYS`: F1–F12 luôn chặn, kể cả F11 (toàn màn hình) — không dùng `.filter()` bỏ F11.
2. Ô nhập văn bản (`isTextField`): trả về `false` để gõ bình thường; chỉ chặn `metaKey`, hoặc `ctrlKey && !altKey` (giữ AltGr = Ctrl+Alt cho tiếng Việt).
3. Ngoài ô nhập: chặn mọi tổ hợp có `ctrlKey || metaKey || altKey` (Ctrl/⌘+F, +S, +P, +D, Ctrl+phím số…).
4. Ngoại lệ cho `Tab`, `Space`, `Enter` khi focus đang ở phần tử tương tác — nếu không sẽ mất khả năng dùng bàn phím.
5. `e.key.length === 1`: chặn phím chữ/dấu in được để tắt "tìm nhanh" của Firefox (`/`, `'`).
6. `PREVENT_CODES`: Space, Backspace, ContextMenu, Tab, các phím mũi tên, Home/End/PageUp/PageDown, Alt trái/phải.

Không chặn được (phải ghi rõ trong giao diện, đừng coi là lỗi): Ctrl/⌘+T, Ctrl/⌘+W, Ctrl/⌘+N, Ctrl+Shift+N/T/Q, Ctrl+Tab, Ctrl+1–9, Ctrl+= / Ctrl+- (zoom), Alt+Tab, phím Windows/⌘, F-Lock.

## Tính năng bổ sung
- Nhật ký phím gần nhất (code, key, thời gian).
- Phát hiện kẹt phím: `keydown` lặp kéo dài (`event.repeat`) mà không có `keyup`.
- Đếm số phím đang giữ cùng lúc (thử n-key rollover).
- Nút "Đặt lại", đếm đã kiểm tra / tổng, thông báo hoàn thành.

## Kiểm tra trước khi xong
- Nhấn từng phím: đúng phím sáng, không trùng phím trái/phải.
- Đổi sang bộ gõ tiếng Việt: vẫn đánh dấu đúng (nhờ `code`).
- Không có phím nào làm trang cuộn, tải lại, mở menu hay bật toàn màn hình của trình duyệt (F1–F12, F11, Tab, Ctrl/⌘+F/S/P, `/`, `'`).
