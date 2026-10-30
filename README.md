# Device Check

Website kiểm tra bàn phím (chuẩn US), loa, camera, microphone, màn hình, CPU & GPU (kiểm tra tải + benchmark), và công cụ chọn phần mềm để tải script cài hàng loạt bằng winget — chạy hoàn toàn trên trình duyệt. Phát hành bằng GitHub Pages.

Bản live: https://supercomboy.github.io/mqhwtest/ · **Báo cáo đầy đủ toàn bộ thay đổi đã thực hiện: [BAO_CAO.md](./BAO_CAO.md)**

## Chạy cục bộ

```bash
npm install
npm run dev
```

## Phát hành lên GitHub Pages

0. Chạy `npm install` một lần và commit `package-lock.json` (khuyến nghị).
1. Tạo repo, đẩy mã lên nhánh `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Mỗi lần đẩy lên `main`, workflow `.github/workflows/deploy.yml` tự build và đăng.

## Đặt file mp3

Chép vào `public/audio/` (xem `public/audio/README.md`).

## Cài phần mềm bằng winget

Mở thẻ **Phần mềm**, chọn app rồi bấm **Tải script (.ps1)**. File tải về dùng `winget` để cài/cập nhật hàng loạt trên Windows 10 1809+ hoặc Windows 11 (cần App Installer). Trang không tự cài gì và không gửi lựa chọn đi đâu.

- Thêm/bớt app: sửa `src/modules/software/catalog.json`, chạy `npm run check:catalog`.
- `wingetId` phải xác minh bằng `winget show --id <id> -e` hoặc manifest `microsoft/winget-pkgs`.

## Dùng với OpenCode

```bash
opencode
```

Cấu hình trong `opencode.json`, quy tắc dự án trong `AGENTS.md`, skill trong `.opencode/skills/`. Ví dụ yêu cầu: "Dùng skill keyboard-tester để làm bài kiểm tra bàn phím".

## Cấu trúc

```
src/main.ts              khởi động, dựng thẻ và menu
src/modules/registry.ts  danh sách bài kiểm tra và công cụ
src/modules/<id>/        mã từng bài kiểm tra/công cụ
src/modules/software/    catalog phần mềm + sinh script winget
src/styles/tokens.css    màu, font, bo góc (chữ nâu nhạt)
scripts/                 kiểm tra dữ liệu catalog
public/audio/            file mp3 kiểm tra loa
.opencode/skills/        skill cho OpenCode
BAO_CAO.md               báo cáo toàn bộ thay đổi & kết quả kiểm thử
```
