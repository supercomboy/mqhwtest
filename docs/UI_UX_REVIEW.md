# MQ Device Tester — UI/UX Review

> Phase 11 · Reviewed against UI/UX Pro Max principles
> Date: [ghi ngày review]

## 1. Bối cảnh

MQ Device Tester là công cụ chẩn đoán phần cứng chạy 100% client-side.
Người dùng: kỹ thuật viên, IT, người dùng PC muốn test nhanh linh kiện.
Design direction: **"Diagnostic Instrument"** — dụng cụ đo chuyên nghiệp, không phải landing page.

## 2. Quyết định UX chính

### 2.1 — Một primary CTA mỗi trang
Mỗi trang test có đúng 1 nút primary (Start/Play). Các action khác (Stop, Reset,
Screenshot) dùng variant secondary/outline để không cạnh tranh sự chú ý.

**Lý do:** user mở trang với 1 mục đích. Nhiều primary CTA phân tán sự tập trung.

### 2.2 — Confirm flow thay vì auto-pass
Browser không thể xác nhận hardware thật sự hoạt động. Vì vậy sau mỗi test:
- Speaker: user xác nhận có nghe không
- Microphone: user xác nhận input có phản hồi
- Camera: user xác nhận có thấy preview
- Display: user xác nhận pattern đúng

**Lý do:** Rule #63 — "Honest hardware testing". Tránh user tin tưởng sai.

### 2.3 — Status badge luôn icon + text + màu
Không bao giờ chỉ dùng màu để truyền đạt trạng thái.

**Lý do:** accessibility — người mù màu vẫn phân biệt được.

### 2.4 — Trạng thái `permission-required` là hạng riêng
Không gộp vào `warning` hay `error`. Có icon `ShieldAlert` và màu riêng.

**Lý do:** user cần phân biệt "chưa xin quyền" vs "quyền bị từ chối" vs "lỗi kỹ thuật".

### 2.5 — Reset tách biệt khỏi Stop
Mọi test có nút Stop (dừng test) và nút Reset (về trạng thái ban đầu).
Không gộp chung.

**Lý do:** user có thể muốn stop rồi xem lại kết quả, không muốn xóa.

## 3. Quyết định Accessibility

### 3.1 — Skip to content
Link ẩn hiện khi Tab lần đầu. Cho phép keyboard user bỏ qua sidebar.

### 3.2 — Centralized aria-live region
Chỉ có **một** `role="status"` duy nhất toàn app (`AriaLiveRegion`), thay vì mỗi badge tự khai báo.

**Lý do:** nhiều aria-live region cùng hoạt động → screen reader đọc chồng chéo, không theo thứ tự. Một region tập trung → tuần tự, dễ theo dõi.

### 3.3 — Document title theo route
Mỗi trang đổi `document.title` (VD: "Keyboard Test · MQ Device Tester").

**Lý do:** screen reader đọc title mới khi navigate → user biết mình đang ở đâu. Cũng giúp browser history dễ nhận biết.

### 3.4 — prefers-reduced-motion
Tôn trọng cài đặt OS. Tắt `animate-ping`, `animate-pulse`, `animate-spin`. Giữ transition màu (không gây khó chịu).

### 3.5 — Focus ring nhất quán
`:focus-visible` toàn app dùng `ring-2 ring-ring ring-offset-2`. Không có element nào `outline: none` mà không có thay thế.

### 3.6 — Semantic HTML
Dùng `<main>`, `<header>`, `<nav>`, `<section>`, `<button>`. Không có `<div onclick>`.

## 4. Quyết định Responsive

### 4.1 — Breakpoint chính
- `≥1024px (lg)`: sidebar cố định + main
- `<1024px`: sidebar ẩn, drawer + hamburger
- `≥1280px (xl)`: Dashboard 3 cột
- `<1280px`: Dashboard 2 cột

### 4.2 — Keyboard scale
Dùng `containerType: inline-size` + `--kb-u: clamp(22px, 3.4cqw, 48px)`.
- ≥1024px: keyboard tự vừa container, không scroll
- <768px: keyboard tối thiểu 680px, cho scroll ngang (không thể nhỏ hơn)

**Lý do:** bàn phím có >100 phím, không thể nhồi vào màn hình điện thoại. Ép nhỏ hơn 22px/1u sẽ không đọc được.

### 4.3 — Event History chạy ngang
Chip ngang với `overflow-x-auto`, chiều cao cố định. Không đẩy nội dung bên dưới.

**Lý do:** nếu chạy dọc, user nhấn càng nhiều phím → panel càng cao → đẩy keyboard xuống → phải scroll.

### 4.4 — Last Key & Event History xếp dọc
Từ Phase 5 revision, 2 panel xếp trên-dưới thay vì trái-phải.

**Lý do:** cho phép KeyInfoPanel hiển thị 4 field dàn ngang thoải mái hơn.

## 5. Quyết định Performance

### 5.1 — Keyboard: React.memo cho mỗi key
`KeyboardKey` so sánh 4 prop (isPressed, isTested, code, variant). Khi nhấn 1 phím, chỉ 1 key re-render thay vì 107.

### 5.2 — Keyboard: Set cho pressed/tested
Dùng `Set<string>` thay vì `Record<string, boolean>`.

**Lý do:** lookup O(1), thêm/xóa O(1), size O(1). Với 107 key, vẫn nhanh nhưng set dễ nhìn hơn.

### 5.3 — Microphone: direct DOM cho level bar
Bar cập nhật qua `element.style.width = ...` trong `rAF`, không qua React state.

**Lý do:** 60 re-render/giây của React sẽ drop frame. Direct DOM ~0 cost.

### 5.4 — Microphone: throttled state cho numeric
Số level/peak cập nhật 10Hz (mỗi 100ms), không phải 60Hz.

**Lý do:** mắt người không phân biệt số nhảy ở 60Hz; 10Hz đủ mượt, tiết kiệm render.

### 5.5 — Camera: video element native
Video render bằng `<video>` element của browser, không dùng canvas render loop.

**Lý do:** browser HW-accelerate decode + display. Canvas render loop sẽ ngốn CPU.

### 5.6 — Display: pattern tĩnh
Mỗi pattern là 1 DOM tĩnh, không animation. Chuyển pattern là unmount/mount.

**Lý do:** animation có thể gây nhầm lẫn khi đánh giá màu, banding, pixel.

## 6. Quyết định về nội dung

### 6.1 — Không có placeholder
Toàn bộ text thật, không có "Coming soon", "TODO".

### 6.2 — Privacy notice ở mic + camera
Hiển thị ở Dashboard footer và trong Limitations của Microphone / Camera pages.

### 6.3 — Limitations notice trên mỗi trang test
Giải thích rõ browser có thể làm gì và **không** thể làm gì.

### 6.4 — Thông báo lỗi cụ thể
Không "Something went wrong". VD: "Microphone permission was denied. Enable it in your browser settings and try again."

## 7. Known Limitations (không thể vượt qua)

### Keyboard
- `Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+R` — browser reserve
- `F5`, `F11`, `F12` — browser reserve
- `Alt+Tab`, `Alt+F4` — OS reserve
- Caps Lock / Num Lock — toggle ở OS, không observable từ browser
- Windows key — OS reserve

### Speaker
- Không xác nhận được loa vật lý phát
- Autoplay policy cần user gesture lần đầu
- Không biết output device đang active

### Microphone
- Chỉ đo được mức, không đo được chất lượng
- Không biết đúng thiết bị nào
- `NotReadableError` khi mic bị app khác chiếm
- Secure context (HTTPS/localhost) bắt buộc

### Camera
- Chỉ hiển thị preview, không đánh giá được chất lượng
- Không biết đúng camera nào
- `NotReadableError` khi camera bị app khác chiếm
- Secure context bắt buộc

### Display
- Không detect dead/stuck pixel tự động
- Monitor tự áp color profile / HDR / night shift → màu không chính xác 100%
- Fullscreen có thể bị chặn trong iframe

### Môi trường
- Secure context là yêu cầu cứng
- HashRouter URL có `#` — đánh đổi cho GitHub Pages static hosting
- Safari iOS hạn chế Fullscreen API

## 8. Kết luận

App đạt chuẩn production cho mục đích chẩn đoán cơ bản. Không có known bug đã biết. Các limitation đều là giới hạn của Web API, đã được ghi rõ trong UI để user không bị lừa dối.

**Ưu tiên cho phiên bản tiếp theo:**
1. Keyboard: thêm "compact mode" cho mobile (chỉ main area)
2. Display: thêm test "moving pattern" để detect ghosting
3. Thêm nút "Print report" (in PDF kết quả session)
4. Hỗ trợ đa ngôn ngữ nếu user base mở rộng