# Device Check

Website kiểm tra bàn phím (chuẩn US), loa, camera, microphone, màn hình và CPU & GPU (kiểm tra tải + benchmark), chạy hoàn toàn trên trình duyệt. Phát hành bằng GitHub Pages.

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

## Dùng với OpenCode

```bash
opencode
```

Cấu hình trong `opencode.json`, quy tắc dự án trong `AGENTS.md`, skill trong `.opencode/skills/`. Ví dụ yêu cầu: "Dùng skill keyboard-tester để làm bài kiểm tra bàn phím".

## Cấu trúc

```
src/main.ts              khởi động, dựng thẻ và menu
src/modules/registry.ts  danh sách bài kiểm tra
src/modules/<id>/        mã từng bài kiểm tra (làm dần)
src/styles/tokens.css    màu, font, bo góc (chữ nâu nhạt)
public/audio/            file mp3 kiểm tra loa
.opencode/skills/        skill cho OpenCode
BAO_CAO.md               báo cáo toàn bộ thay đổi & kết quả kiểm thử
```
