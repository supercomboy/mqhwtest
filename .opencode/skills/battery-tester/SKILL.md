---
name: battery-tester
description: Bài kiểm tra pin laptop — xả pin thật đo %/giờ và tính phần trăm chai từ dung lượng thiết kế so với dung lượng đầy. Dùng khi tạo hoặc sửa module battery, trang /test-pin/, công thức xả pin, chế độ nhập tay hoặc mock pin.
---

# Battery tester — pin laptop (xả pin + % chai)

Module `src/modules/battery/`, đăng ký trong `registry.ts` với id `battery`, landing page `/test-pin/`.

## Giới hạn nền tảng (quyết định thiết kế)
- Battery API (`navigator.getBattery`) chỉ có trên **Chrome/Edge**, secure context, có thể bị Permissions-Policy chặn. Đọc được: `level` (0–1, làm tròn %), `charging`. `chargingTime`/`dischargingTime` thường là `Infinity` trên Windows — **không dùng**.
- API **không** đọc được design capacity, full charge capacity, cycle count → % chai phải tính từ 2 số người dùng nhập (từ báo cáo pin của hệ điều hành). Gợi ý lấy số nằm trong `<details>`, không viết hướng dẫn dài.

## Kiến trúc
- `capacity.ts` — toán thuần, không DOM: `computeHealth` (sức khoẻ = full/design×100, chặn hiển thị 0–100, cờ `overDesign`), `classifyHealth` (≥90 good / ≥80 light / ≥65 clear / else heavy), `fmtNum/fmtPct/fmtHours/fmtClock`.
- `drain.ts` — `BatterySource` (real/mock, chuẩn hoá level về 0–100), `computeDrainStats` (chỉ cộng Δmức trên đoạn liên tiếp `charging === false`, cần ≥5 phút mới cho rate), `detectAnomalies` (recharge, fastdrop ≥5 điểm % trong ≤2 phút), lưu phiên `localStorage` key `mqhwtest.battery.session.v1` (`{v:1,status,savedAt,samples,capacity}`), helper `toLocalInputValue/parseLocalInputValue`.
- `load-worker.ts` — worker storm vô hạn (như `cpu-worker` của bench); main thread `terminate()`. **Phải có `export {}`** để tsc không coi là global script trùng tên với worker khác.
- `battery.ts` — mount, trả cleanup (dừng timer, gỡ listener battery, terminate worker, nhả Wake Lock, gỡ `visibilitychange`, `root.remove()`).

## Công thức
- % chai = 100 − sức khoẻ; sức khoẻ = full ÷ design × 100.
- %/giờ = Σ Δmức ÷ Σ thời gian (chỉ đoạn không sạc); còn lại = level ÷ rate; tổng = 100 ÷ rate; ETA = (level − đích) ÷ rate; W = (%/giờ ÷ 100) × fullWh (chỉ khi đơn vị Wh).
- Bất thường: sạc giữa phiên · tụt ≥5%/≤2 phút · đứng yên >30 phút khi đang tải (cờ live) · máy tắt ở mức ≥5% (input người dùng).

## Quy tắc bắt buộc
- Màu/bo/bóng chỉ từ `tokens.css`; class tiền tố `.bat__*`; nút ≥44px; `role="status"` cho notice; `prefers-reduced-motion`.
- Thiếu Battery API / bị chặn → ẩn nút đo, tự mở chế độ nhập tay, thông báo rõ — không để trang lỗi. Wake Lock và `localStorage` đều bọc try/catch.
- Mock cho kiểm thử tự động: `?mock=1` (pin giả tụt 1%/8 giây). Không chờ xả thật khi test tự động.
- Giao diện tiếng Việt, identifier tiếng Anh. Cập nhật `BAO_CAO.md` (mục 14) sau mọi thay đổi.

## Kiểm thử trước khi báo hoàn thành
1. `npm run build` phải xanh (gồm check-seo, hiện 6 trang).
2. `npm run preview` → `/test-pin/?mock=1`: bấm Bắt đầu, thấy mức pin/biểu đồ/bảng cập nhật; Dừng; mở "Bảng số liệu từng mẫu".
3. Nhập 5000/4100 Wh → ring 82%, "Chai nhẹ — chai 18% — đã mất 900 Wh".
4. Reload giữa phiên → gợi ý "Tiếp tục phiên trước", dung lượng được điền lại.
5. Chế độ nhập tay 95→40 trong 1 giờ → 55%/giờ, còn lại 44 phút, tổng 1 giờ 49 phút.
6. Nhập "máy tắt ở 30%" → kết luận có dòng ⚠.
7. Trang chủ có thẻ "Pin laptop" link `/test-pin/`.
