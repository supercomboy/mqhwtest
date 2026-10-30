---
name: software-installer
description: Công cụ chọn phần mềm kiểu Ninite và tạo script PowerShell cài hàng loạt bằng winget cho Device Check. Dùng khi sửa danh mục phần mềm, cách sinh script, giao diện chọn app hoặc xử lý lỗi cài đặt trên Windows.
---

# Công cụ cài phần mềm (winget)

## Khi nào dùng
Khi làm việc với `src/modules/software/`, `scripts/check-catalog.mjs`, hoặc khi thêm/bớt app trong `catalog.json`. Kết hợp skill `apple-brown-design` cho giao diện.

## Kiến trúc
- `catalog.json` — nguồn dữ liệu duy nhất: `categories` (id, label) và `apps` (id, name, publisher, description, category, wingetId?, homepage, recommended?, note?).
- `catalog.ts` — export `categories`, `apps`, type, và `validateCatalog()` (kiểm tra id trùng, nhóm hợp lệ, homepage https, wingetId regex + trùng, có ít nhất một app "Cơ bản").
- `install-script.ts` — hàm thuần `buildPowerShell(apps, { siteUrl, generatedAt? })` và `buildWingetOneLiner(apps)`; `SCRIPT_FILENAME`.
- `software.ts` — UI: tìm kiếm, chọn bộ cơ bản, chọn/bỏ chọn, đếm, tải `.ps1`, sao chép lệnh, xem trước.
- `scripts/check-catalog.mjs` — kiểm tra JSON bằng Node thuần; chạy trong `npm run build`.

## Quy tắc dữ liệu
1. Chỉ app **miễn phí/freemium**, tải từ nguồn chính thức; ghi `note` khi có điều kiện bản quyền (WinRAR dùng thử, TeamViewer cá nhân).
2. Mỗi app phải có `homepage` là `https://` của nhà phát hành.
3. `wingetId` phải xác minh được bằng `winget show --id <id> -e`, manifest `microsoft/winget-pkgs`, hoặc trang tra cứu (winget.run, winstall.app). Ghi ngày xác minh vào `BAO_CAO.md`.
4. App chưa có trên winget: bỏ `wingetId`; UI sẽ chỉ hiện "Tải thủ công" và không đưa vào script.
5. `recommended` dùng cho nút "Chọn bộ cơ bản"; không đánh dấu app có điều kiện bản quyền phức tạp.
6. Thêm app mới: sửa JSON, chạy `npm run check:catalog`, kiểm tra lại giao diện; không cần sửa `software.ts`.

## Quy tắc script
- Không chèn dữ liệu người dùng nhập; chỉ ID từ catalog đã qua regex.
- Escape nháy đơn PowerShell bằng cách nhân đôi (`'` → `''`).
- File UTF-8 **có BOM** (thêm `\uFEFF` khi tạo Blob) và dùng CRLF để Notepad/PowerShell 5.1 đọc đúng tiếng Việt.
- Kiểm tra `Get-Command winget` trước; thiếu thì hướng dẫn cài App Installer rồi thoát.
- Mỗi app chạy `winget install --id <id> --exact --silent --accept-package-agreements --accept-source-agreements`; mã lỗi chỉ cảnh báo, **không dừng** các app sau.
- Có tổng kết `$ok`/`$fail` và `Read-Host` để cửa sổ không đóng ngay.
- Không tải mã từ xa, không gọi API, không analytics.

## Giao diện
- Modal dùng chung; intro + cảnh báo Windows/winget; toolbar tìm kiếm (bỏ dấu tiếng Việt) + "Chọn bộ cơ bản" + "Bỏ chọn tất cả".
- Danh sách cuộn nội bộ (`max-height: min(52dvh, 560px)`) để thanh hành động luôn thấy; mỗi nhóm có tiêu đề.
- Thẻ app: checkbox + tên + nhà phát hành + mô tả + `note` + link "Trang chủ"; nhãn "Cơ bản"/"Tải thủ công".
- Nút tải/copy disabled khi chưa chọn; `aria-live` cho số lượng và thông báo.
- Chỉ dùng token trong `tokens.css`; không viết mã màu trực tiếp; 1 cột dưới 640px.

## Kiểm tra trước khi xong
1. `npm run check:catalog` và `npm run build` pass.
2. File `.ps1` parse được: `[void][scriptblock]::Create((Get-Content -Raw <file>))`; 3 byte đầu `EF BB BF`.
3. Script chỉ chứa app đã chọn; tên có dấu `'` được escape đúng.
4. Mọi `wingetId` đã xác minh; ghi kết quả vào `BAO_CAO.md`.
5. Chrome + Firefox: chọn/bỏ chọn, tìm kiếm, tải file, copy (kể cả khi chặn clipboard), preview khớp file.
6. Không có request mạng ngoài tài nguyên trang; đóng modal không lỗi console.
