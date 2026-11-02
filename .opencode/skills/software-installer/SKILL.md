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
- `install-script.ts` — hàm thuần `buildBatch(apps, { siteUrl, generatedAt? })` (file `.bat` một chạm), `buildPowerShell(apps, …)` (bản `.ps1` dự phòng) và `buildWingetOneLiner(apps)`; hằng `SCRIPT_FILENAME = 'device-check-apps.bat'`, `PS_MARKER = '#:PS'`, cùng các URL + SHA-256 của gói App Installer đã ghim.
- `software.ts` — UI: tìm kiếm, chọn bộ cơ bản, chọn/bỏ chọn, đếm, tải `.bat`, sao chép lệnh, xem trước.
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
- Sản phẩm tải về là **một file `.bat` duy nhất**: phần batch (`@echo off`, `chcp 65001`, `set "DC_SELF=%~f0"`, gọi `powershell -Command` đọc lại chính file bằng UTF-8) kết thúc bằng `exit /b`, sau dấu `#:PS` là payload PowerShell. cmd không bao giờ đọc tới phần payload.
- File ghi **UTF-8 không BOM**, xuống dòng CRLF (BOM sẽ làm hỏng dòng `@echo off` đầu tiên). Byte đầu phải là `40 65 63` (`@ec`).
- Payload bật `[Console]::OutputEncoding = [Text.Encoding]::UTF8` để tiếng Việt hiển thị đúng trong cửa sổ cmd.
- Tự nâng quyền đúng một lần: kiểm tra `WindowsPrincipal.IsInRole(Administrator)`, nếu chưa thì `Start-Process -FilePath $env:ComSpec -ArgumentList '/c',('"'+$env:DC_SELF+'"') -Verb RunAs` rồi thoát.
- Kiểm tra winget **trước** bằng `Get-Command winget`; nếu thiếu: chặn khi build < 17763; nếu không, hỏi `Read-Host` (mặc định N). Chỉ khi người dùng đồng ý mới tải 3 gói chính thức của Microsoft theo thứ tự VCLibs 14.00 x64 → Windows App Runtime 1.8 (`--quiet`) → App Installer **ghim phiên bản** (verify `Get-FileHash` SHA-256 trước khi `Add-AppxPackage`). Đây là ngoại lệ duy nhất của luật "không tải mã từ xa".
- Mỗi app chạy `winget install --id <id> --exact --silent --accept-package-agreements --accept-source-agreements`; **không dừng** các app sau khi một app lỗi.
- Phân loại theo `$LASTEXITCODE`: `0` → `$ok`; `-1978335189` (`0x8A15002B`, app đã ở bản mới nhất) → `$skip` (không phải lỗi!); mã khác → kiểm chứng `winget list --id <id> --exact`, thấy app thì `$skip`, không thấy mới `$fail` + `Write-Warning` kèm mã hex `0x{0:X8}`.
- Tổng kết `$ok`/`$skip`/`$fail`, in danh sách `$failed`, rồi `Read-Host` để cửa sổ không đóng ngay.
- Không gọi API, không analytics, không tải gì khác ngoài 3 gói Microsoft nói trên.

## Giao diện
- Modal dùng chung; intro + cảnh báo Windows/winget; toolbar tìm kiếm (bỏ dấu tiếng Việt) + "Chọn bộ cơ bản" + "Bỏ chọn tất cả".
- Danh sách cuộn nội bộ (`max-height: min(52dvh, 560px)`) để thanh hành động luôn thấy; mỗi nhóm có tiêu đề.
- Thẻ app: checkbox + tên + nhà phát hành + mô tả + `note` + link "Trang chủ"; nhãn "Cơ bản"/"Tải thủ công".
- Nút tải/copy disabled khi chưa chọn; `aria-live` cho số lượng và thông báo.
- Chỉ dùng token trong `tokens.css`; không viết mã màu trực tiếp; 1 cột dưới 640px.

## Kiểm tra trước khi xong
1. `npm run check:catalog` và `npm run build` pass.
2. File `.bat`: 3 byte đầu `40 65 63` (không BOM), toàn bộ CRLF, không có LF lẻ; payload sau `#:PS` parse được bằng `[void][scriptblock]::Create(($lines[($i+1)..($lines.Length-1)] -join [char]10))`.
3. Chạy thử bằng file nháp (payload chỉ `Write-Host`) để chắc phần batch gọi đúng payload và tiếng Việt hiển thị đúng; thử nhánh thiếu winget: từ chối → thoát mã 1, không tải gì; build < 17763 → báo lỗi và thoát.
4. Script chỉ chứa app đã chọn; tên có dấu `'` được escape đúng.
5. Mọi `wingetId` đã xác minh; ghi kết quả vào `BAO_CAO.md`.
6. Chrome + Firefox: chọn/bỏ chọn, tìm kiếm, tải file, copy (kể cả khi chặn clipboard), preview khớp file.
7. Không có request mạng ngoài tài nguyên trang; đóng modal không lỗi console.
