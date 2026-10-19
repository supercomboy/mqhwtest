---
name: github-pages-deploy
description: Phát hành Device Check lên GitHub Pages bằng GitHub Actions, gồm bật Pages, đường dẫn tương đối, tên miền riêng và xử lý lỗi triển khai. Dùng khi nói về deploy, hosting, workflow, 404 sau khi đăng, hoặc đổi tên miền.
---

# Phát hành lên GitHub Pages

## Khi nào dùng
Khi người dùng muốn đăng website, sửa `.github/workflows/deploy.yml`, hoặc gặp lỗi sau khi đăng.

## Thiết lập một lần (làm trên github.com)
1. Tạo repo và đẩy mã lên nhánh `main`.
2. Vào Settings → Pages → mục Build and deployment → Source chọn **GitHub Actions**.
3. Đẩy mã (hoặc chạy tay workflow "Deploy to GitHub Pages" ở tab Actions). Địa chỉ site hiện ở bước deploy: `https://<user>.github.io/<repo>/`.

## Quy tắc trong dự án
- `vite.config.ts` đặt `base: './'` để đường dẫn tài nguyên tương đối, đúng cả khi site nằm trong thư mục con của repo lẫn khi dùng tên miền riêng.
- Tài nguyên tĩnh (file mp3) để trong `public/`; trong mã dùng `import.meta.env.BASE_URL`, không viết `/audio/...`.
- `public/.nojekyll` đã có để GitHub không xử lý Jekyll.
- Workflow dùng các action chính thức: `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`; quyền `pages: write` và `id-token: write` là bắt buộc.
- Nên chạy `npm install` cục bộ rồi commit `package-lock.json`: workflow tự dùng `npm ci` khi có file này (nhanh và cố định phiên bản), chưa có thì dùng `npm install`. Khi đã có lockfile có thể thêm `cache: npm` vào bước `actions/setup-node`.

## Tên miền riêng (tùy chọn)
Thêm file `public/CNAME` chứa đúng một dòng là tên miền, đặt bản ghi DNS theo hướng dẫn của GitHub, rồi bật "Enforce HTTPS" trong Settings → Pages. Camera và micro cần HTTPS.

## Lỗi thường gặp
- Trang trắng, lỗi 404 cho file js/css: `base` sai; kiểm tra lại là `'./'`.
- Workflow báo thiếu quyền hoặc Pages chưa bật: kiểm tra Source = GitHub Actions và khối `permissions`.
- `npm ci` lỗi: thiếu hoặc lệch `package-lock.json`; chạy `npm install` và commit lại file đó.
- Camera/micro không hỏi quyền: đang mở bằng `http://` hoặc `file://`; dùng địa chỉ `https://` của Pages hoặc `localhost`.
- Âm thanh 404: tên file mp3 khác với khai báo, hoặc file chưa được commit (kiểm tra phân biệt hoa thường).

## Trước khi đẩy mã
Chạy `npm run build` và `npm run preview`, mở thử bản build.
