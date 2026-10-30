# Device Check — hướng dẫn cho agent

Website tĩnh kiểm tra bàn phím (chuẩn US), loa (1 file quét dải trầm/bổng + 2 bản nhạc mẫu), camera, microphone, màn hình, CPU & GPU (kiểm tra tải + benchmark), và công cụ chọn phần mềm để tải script cài hàng loạt bằng winget. Chạy hoàn toàn trong trình duyệt, đặt trên GitHub Pages. Giao diện tiếng Việt, kiểu Apple, chữ nâu nhạt.

## Lệnh

- `npm install` cài thư viện
- `npm run dev` chạy thử cục bộ (`localhost` được coi là secure context nên camera/micro hoạt động)
- `npm run build` kiểm tra kiểu, kiểm tra catalog rồi build ra `dist/` (phải qua trước khi báo hoàn thành)
- `npm run check:catalog` kiểm tra toàn vẹn `src/modules/software/catalog.json`
- `npm run preview` xem bản build

## Quy tắc bắt buộc

- Không backend, không gọi API ngoài, không analytics, không cookie theo dõi. Ảnh camera và âm thanh micro không bao giờ rời khỏi máy.
- Chỉ dùng TypeScript + CSS thuần. Thêm thư viện phải có lý do rõ ràng; ưu tiên API của trình duyệt.
- Mỗi bài kiểm tra/công cụ là một module độc lập trong `src/modules/<id>/`, đăng ký trong `src/modules/registry.ts`.
- Màu, font, bo góc, bóng chỉ lấy từ `src/styles/tokens.css`. Không viết mã màu trực tiếp trong component.
- Chữ chính là kem `--text` (#FFE2B8) trên nền nâu đậm. `--text-soft` chỉ dùng cho chữ từ 18px trở lên.
- Mọi đường dẫn tài nguyên là đường dẫn tương đối (dùng `import.meta.env.BASE_URL`), vì site nằm ở `https://<user>.github.io/<repo>/`.
- Site dùng **một bảng màu tối duy nhất** (nền `--bg` = #1D1B19) ở cả chế độ sáng lẫn tối của hệ điều hành, vì chữ kem chỉ đạt tương phản khi nền tối. Không thêm theme sáng trừ khi đổi màu chữ.
- Tôn trọng `prefers-reduced-motion` và `prefers-reduced-transparency`.
- Nội dung giao diện bằng tiếng Việt; tên biến, hàm, commit bằng tiếng Anh.
- Luôn gọi `track.stop()` cho mọi MediaStream khi rời bài kiểm tra hoặc đóng trang.
- Thiết bị hoặc API không hỗ trợ (ví dụ Safari thiếu `getLayoutMap`, `setSinkId`) phải phát hiện tính năng và ẩn hoặc có phương án thay thế, không để trang lỗi.
- Danh mục phần mềm chỉ dùng app miễn phí/freemium với `wingetId` chính thức đã xác minh; không app trả phí/crack. Script sinh ra phải xem trước được, chỉ chứa lệnh tĩnh, không tải mã từ xa.

## Skill có sẵn (trong `.opencode/skills/`)

- `apple-brown-design`: quy tắc giao diện
- `keyboard-tester`: bàn phím US ANSI, PC và MacBook
- `speaker-tester`: loa, file quét dải trầm/bổng và 2 bản nhạc mẫu
- `camera-mic-tester`: camera và microphone
- `display-tester`: màn hình
- `bench-tester`: CPU & GPU (kiểm tra tải + benchmark)
- `software-installer`: danh mục phần mềm và script cài hàng loạt bằng winget
- `github-pages-deploy`: phát hành lên GitHub Pages

Khi làm một bài kiểm tra hoặc công cụ, nạp skill tương ứng trước khi viết mã.

## Báo cáo

Mọi thay đổi và kết quả kiểm thử phải được cập nhật vào `BAO_CAO.md` ở thư mục gốc (bảng lịch sử commit, tính năng mới, công thức, kết quả test).

## Hoàn thành khi

`npm run build` không lỗi, bài kiểm tra/công cụ chạy được trên Chrome và ít nhất một trình duyệt khác, và đã xử lý trường hợp bị từ chối quyền hoặc không có thiết bị.
