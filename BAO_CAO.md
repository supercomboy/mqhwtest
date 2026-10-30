# Báo cáo dự án Device Check

> Website kiểm tra thiết bị & hiệu năng, chạy hoàn toàn trong trình duyệt, phát hành bằng GitHub Pages.
> Báo cáo này ghi lại **toàn bộ thay đổi và công việc đã thực hiện** cho dự án (cập nhật lần cuối: 2026-10-30).

- **Repo:** `github.com/supercomboy/mqhwtest` (nhánh `main`)
- **Bản live:** https://supercomboy.github.io/mqhwtest/
- **Ngôn ngữ:** TypeScript + CSS thuần, build bằng Vite. Không backend, không API ngoài, không analytics.
- **Giao diện:** tiếng Việt, phong cách Apple, chữ kem `--text` (#FFE2B8) trên nền nâu tối `--bg` (#1D1B19).

---

## 1. Tổng quan

| Hạng mục | Nội dung |
|---|---|
| Số bài kiểm tra | **6** — Bàn phím, Loa, Camera, Microphone, Màn hình, CPU & GPU |
| Công cụ | **Cài phần mềm** — chọn app, tải script PowerShell dùng winget |
| Danh mục phần mềm | **34 app / 9 nhóm**, 10 app “Cơ bản” trong `src/modules/software/catalog.json` |
| Tổng mã nguồn `src/` | 34 file, ~215 KB (chưa tính `node_modules`) |
| Số commit | 14 (từ 2026-10-19 đến 2026-10-30) |
| Skill OpenCode | 8 skill trong `.opencode/skills/` |
| Tài nguyên tĩnh | `public/logo.png`, 3 file MP3 trong `public/audio/` |

## 2. Kiến trúc

```
index.html                 điểm vào, khối logo + menu thẻ
src/main.ts                khởi động app, dựng menu và gọi mount() theo thẻ được chọn
src/modules/registry.ts    danh sách bài kiểm tra (id, title, description, mount)
src/modules/<id>/          mã từng bài kiểm tra (module độc lập, tự dọn dẹp khi rời)
src/modules/bench/         mã bài CPU & GPU
src/modules/software/      catalog phần mềm + sinh script winget
src/styles/tokens.css      màu, font, bo góc, bóng, easing (nguồn duy nhất của màu)
src/styles/main.css        layout chung, class .btn / .btn--ghost / .grid
scripts/check-catalog.mjs  kiểm tra toàn vẹn catalog phần mềm
public/                    logo, file âm thanh (đường dẫn tương đối qua import.meta.env.BASE_URL)
.opencode/skills/          hướng dẫn agent cho từng bài kiểm tra
.github/workflows/deploy.yml  tự build + deploy GitHub Pages khi push lên main
```

Nguyên tắc kiến trúc áp dụng cho **mọi** module:

1. Mỗi bài kiểm tra là một thư mục riêng `src/modules/<id>/`, đăng ký trong `registry.ts`.
2. `mount(container)` trả về hàm dọn dẹp: gỡ listener, dừng timer, `worker.terminate()`, `track.stop()`, `root.remove()`.
3. Màu/bo góc/bóng chỉ lấy từ `tokens.css` — không viết mã màu trực tiếp trong component.
4. API không được hỗ trợ phải phát hiện tính năng và có phương án thay thế, không để trang lỗi.
5. Danh mục phần mềm là dữ liệu tĩnh (`catalog.json`); script cài đặt chỉ chứa lệnh sinh từ catalog, không tải mã từ xa và phải xem trước được.

## 3. Các bài kiểm tra

### 3.1 Bàn phím (`keyboard`) — US ANSI, PC & MacBook
- Bố cục US ANSI đầy đủ; tự phát hiện **laptop** để vẽ bố cục **MacBook** (commit `ee10d98`).
- Mỗi phím bấm sáng lên, chống ghi đè bằng `detect.ts` (nhận dạng phím lặp, phím bị kẹt).
- **Chặn phím tắt trình duyệt** khi bài kiểm tra đang mở: F1–F12 (kể cả F11), tổ hợp Ctrl/⌘/Alt, phím in được; ngoại lệ AltGr trong ô nhập liệu (commit `0741e8e`).

### 3.2 Loa (`speaker`) — quét dải + 3 bản mẫu
- **File quét dải trầm/bổng** `speaker-sweep.mp3` (440 529 B, 27,5 s, chia 4 đoạn có nhãn, hiện đoạn đang phát bằng pill `.spk-track__now`) — thay file cũ (commit `483fb2b`).
- 2 bản nhạc mẫu: `speaker-test-1.mp3` (1 755 242 B, 96,5 s), `speaker-test-2.mp3` (3 846 813 B).
- Chọn thiết bị phát (`setSinkId` nếu có, ẩn nếu không), kiểm tra cân bằng trái/phải.

### 3.3 Camera (`camera`) — xem trước + độ phân giải thật
- Yêu cầu stream với ràng buộc **mềm** `width/height ideal 3840×2160` để trình duyệt chọn chế độ lớn nhất phần cứng hỗ trợ (fallback `{video:true}` nếu `OverconstrainedError`).
- Đọc kích thước thật từ `video.videoWidth/videoHeight` qua sự kiện `loadedmetadata` + `resize`.
- Chip **"Tối đa: W × H"** lấy từ `track.getCapabilities()` (tự ẩn nếu trình duyệt không hỗ trợ).
- Chụp thử, lật gương, tự đánh giá Đạt/Chưa đạt (commit `fc1c8ac`).

### 3.4 Microphone (`microphone`) — mức âm + ghi âm
- Đo mức âm theo thời gian thực (Web Audio `AnalyserNode`), hiển thị dBFS.
- Ghi âm 5 giây, nghe lại ngay trong trang; nút bật/tắt thiết bị, xử lý khi bị từ chối quyền.

### 3.5 Màn hình (`display`) — màu & độ giật
- Kiểm tra điểm chết, loang sáng, dải xám, chữ/khối chuyển động và thông tin hiển thị (độ phân giải, tần số quét, DPR).

### 3.6 CPU & GPU (`bench`) — kiểm tra tải + benchmark *(mới)*
Xem mục 5.

### 3.7 Phần mềm (`software`) — chọn app, tải script cài hàng loạt *(mới)*
- 34 app / 9 nhóm: Trình duyệt, Liên lạc, Văn phòng & PDF, Media & đồ họa, Tiện ích & lưu trữ, Lập trình & runtime, Bảo mật & giải trí, Công cụ kiểm thử, Hỗ trợ từ xa.
- Tick chọn app → tải `device-check-apps.ps1` (UTF-8 BOM), chạy `winget install` cho từng app; có nút “Chọn bộ cơ bản”, tìm kiếm không dấu, xem trước script và sao chép lệnh.
- Trang không tự cài, không gửi lựa chọn; mỗi app có link trang chủ để tải thủ công.

## 4. Lịch sử thay đổi (theo commit)

| # | Commit | Ngày | Nội dung | File chính |
|---|---|---|---|---|
| 1 | `5cfa460` | 19-10 | Khởi tạo dự án Device Check: 5 bài kiểm tra, Vite + TS, workflow deploy Pages | 43 file, +6 777 dòng |
| 2 | `fd2ad7a` | 19-10 | Bỏ bước `configure-pages` (Pages đã bật), workflow tự build | `deploy.yml` |
| 3 | `b01a53f` | 22-10 | Chuyển site sang **một bảng màu tối duy nhất**, chữ kem `--text` #FFE2B8 | `tokens.css`, `AGENTS.md` |
| 4 | `ee10d98` | 22-10 | Bỏ chế độ "laptop" giả → dựng bố cục **MacBook thật** | `keyboard/*` (+227/−62) |
| 5 | `0741e8e` | 22-10 | **Chặn phím tắt trình duyệt** khi đang test bàn phím | `keyboard.ts` (+61) |
| 6 | `d7e71b2` | 28-10 | Thêm bản nhạc mẫu thứ 3 cho bài test loa | `speaker-test-2.mp3` |
| 7 | `e1cace5` | 28-10 | Thay file âm thanh thứ 2 bằng bản ghi mới | `speaker-test-1.mp3` |
| 8 | `ee01973` | 28-10 | Thay logo bằng logo lockup MQ Tech mới (1024×1024, 42 575 B) | `logo.png`, `main.css` |
| 9 | `483fb2b` | 28-10 | Thay bản nhạc 1 bằng **file quét dải trầm/bổng** có nhãn đoạn | `speaker-sweep.mp3` |
| 10 | `fc1c8ac` | 28-10 | Camera dùng **độ phân giải gốc của phần cứng** + chip "Tối đa" | `camera.ts` (+47) |
| 11 | `a6cc287` | 30-10 | **Thêm module CPU & GPU** (kiểm tra tải + benchmark) | `src/modules/bench/*` (+937) |
| 12 | `5496899` | 30-10 | Thêm báo cáo dự án tổng hợp | `BAO_CAO.md` |
| 13 | (commit này) | 30-10 | **Thêm công cụ Cài phần mềm**: catalog 31 app + sinh script winget + validator | `src/modules/software/*`, `scripts/check-catalog.mjs` |
| 14 | (commit này) | 30-10 | Thêm **FurMark, Heaven Benchmark, Cinebench R23** vào nhóm “Công cụ kiểm thử” | `src/modules/software/catalog.json` |

## 5. Module CPU & GPU — chi tiết

### 5.1 Thành phần

| File | Vai trò |
|---|---|
| `src/modules/bench/bench.ts` | Giao diện + điều phối (mount/cleanup) + đường dự phòng chạy GPU trên tab chính |
| `src/modules/bench/gpu-gl.ts` | Shader WebGL2 (GLSL ES 3.00) + lớp `GpuRenderer` dùng chung cho worker và fallback |
| `src/modules/bench/gpu-worker.ts` | Worker OffscreenCanvas + WebGL2: storm vô hạn, bench đo N khung hình |
| `src/modules/bench/cpu-worker.ts` | Worker CPU: storm vô hạn, bench chạy số vòng cố định |
| `src/modules/bench/bench.css` | Style tokens-only, tiền tố `.bench__*` |
| `src/modules/bench/index.ts` | `export { mountBench } from './bench';` |
| `.opencode/skills/bench-tester/SKILL.md` | Skill mô tả công thức, quy tắc, cách kiểm thử |

Worker được tạo bằng cú pháp Vite: `new Worker(new URL('./gpu-worker.ts', import.meta.url), { type: 'module' })`.

### 5.2 Thuật toán (port từ kernel gpu.js của mprep.info/gpu — **tự viết**, không nhúng gpu.js)

**Shader (mỗi texel):**
```glsl
tid = floor(gl_FragCoord.x) + floor(gl_FragCoord.y) * uSize;
t = 0.0;
for (i = 0; i < uLoop; i++) {
  t += mod(tid, 5466587) * mod(tid, 6847648) - mod(tid, 51374684);
  t = t / max(mod(tid, 9769864), 1.0) * 6541;
  t = exp(t);
  t = sqrt(sqrt(sqrt(sqrt(sqrt(sqrt(t))))));   // 6 lần căn
}
```
Giá trị vòng sau phụ thuộc vòng trước → trình biên dịch không thể bỏ vòng lặp.

**Dải toán CPU (mỗi worker):**
```ts
s = (5458700 * seed) % 54687 * ((6847648 * seed) % 68648) - 98468 * (seed % 513684);
s = (s % 9769864) / 9769864;      // chuẩn hoá về [0,1) để exp không tràn
s = Math.exp(s);
s = 6 × Math.sqrt(s);             // 6 lần căn
```

### 5.3 Công thức tính điểm

| Hạng mục | Tham số | Công thức |
|---|---|---|
| GPU | vùng vẽ 1000×1000 (1e6 texel), 10 000 vòng/texel, 400 khung | tổng `4e12` phép tính → **điểm = `4e12 / ms / 1000`** (phép tính/µs) |
| CPU đa luồng | mỗi worker 5e7 vòng, số worker = `hardwareConcurrency` (giới hạn 32) | **điểm = `Σ(iters / ms / 1000)`** |
| CPU đơn luồng | — | **điểm = `floor(điểm đa luồng) / số luồng`** |

Hiển thị: `Math.floor(score).toLocaleString('vi-VN') + ' phép tính/µs'`.

> **Lưu ý so sánh:** tải GPU **giống hệt** mprep nên điểm GPU có thể so sánh tham khảo. CPU dùng `5e7` vòng/worker (mprep dùng `1e10`, chạy vài phút) nên **điểm CPU không so sánh được** với bảng của mprep — đã ghi rõ trong `SKILL.md`.

### 5.4 Giao diện

- **Kiểm tra tải (stress test):** nút `Nạp GPU` · `Nạp CPU` · `Nạp CPU & GPU` · `Dừng`, kèm dòng trạng thái và đồng hồ đã chạy (mm:ss).
- **Benchmark:** nút `Benchmark GPU` · `Benchmark CPU` · `Dừng`, thanh tiến trình (`role="progressbar"`), các dòng kết quả: Điểm GPU, Card GPU, Điểm CPU đa luồng, Điểm CPU đơn luồng, Tổng thời gian, Số luồng CPU.
- Card GPU lấy từ `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`) trên canvas tạm.
- Ghi chú giới hạn hiện ngay trên UI: tải là **synthetic**, điểm khác nhau theo trình duyệt, cần **giữ tab đang mở**, và với trình duyệt không hỗ trợ OffscreenCanvas thì dừng stress GPU có thể phải đóng cửa sổ trình duyệt.

### 5.5 Đường dự phòng & dọn dẹp

- Worker không dựng được WebGL2 (báo `error` hoặc `onerror`) → **tự chuyển sang chạy shader trên tab chính**, chia theo `requestAnimationFrame` để vẫn dừng được; có nhãn trạng thái *"chạy ngay trên tab này"*.
- Rời bài kiểm tra → `worker.terminate()` mọi worker, `cancelAnimationFrame`, `clearInterval`, `dispose()` renderer, `root.remove()`.

### 5.6 Tham số kiểm thử (không hiện ra giao diện)

| Tham số | Tác dụng |
|---|---|
| `?quick` | GPU 200×200 / 64 vòng / 8 khung; CPU 2e6 vòng — chỉ dùng cho kiểm thử tự động, **không phải điểm số thật** |
| `?mainthread=1` | Ép chạy GPU trên tab chính để kiểm tra đường dự phòng |

## 6. Công cụ cài phần mềm (`software`)

### 6.1 Cơ chế

Site tĩnh không thể tạo file `.exe` như Ninite, nên công cụ tạo **một script PowerShell** dùng `winget` — tương đương “chọn app → tải một file → chạy”. Trang **không tự cài** và **không gửi lựa chọn** đi đâu.

Luồng: `catalog.json` → `catalog.ts` (kiểm tra) → `software.ts` (UI, `Set<id>`) → `install-script.ts` (sinh `.ps1` / one-liner) → Blob tải về hoặc clipboard.

### 6.2 Catalog

`src/modules/software/catalog.json` là nguồn dữ liệu duy nhất: 8 nhóm, 31 app. Mỗi app có `id`, `name`, `publisher`, `description`, `category`, `wingetId`, `homepage`, `recommended?`, `note?`. App chưa có trên winget có thể bỏ `wingetId` — UI chỉ hiện link tải thủ công.

- **Bộ cơ bản (10 app):** Chrome, Cốc Cốc, Zalo, UniKey, 7-Zip, VLC, K-Lite, LibreOffice, Adobe Reader, Everything.
- **Công cụ kiểm thử:** FurMark (tải GPU), Unigine Heaven Benchmark (benchmark GPU), Cinebench R23 (CPU đơn/đa luồng) — không nằm trong bộ cơ bản.
- **Ghi chú bản quyền:** WinRAR bản dùng thử 40 ngày; TeamViewer miễn phí cho cá nhân; K-Lite dùng bản Standard.
- **Kiểm tra tự động:** `scripts/check-catalog.mjs` (Node thuần) chạy trong `npm run build`, bắt id trùng, nhóm sai, homepage không https, `wingetId` sai định dạng/trùng, thiếu app “Cơ bản”.

### 6.3 Script sinh ra

- Tên file `device-check-apps.ps1`, UTF-8 **có BOM**, xuống dòng CRLF.
- Header ghi ngày tạo, URL trang, lệnh chạy gợi ý; kiểm tra `Get-Command winget` trước khi cài.
- Mỗi app: `winget install --id <id> --exact --silent --accept-package-agreements --accept-source-agreements`; mã lỗi chỉ `Write-Warning` và **tiếp tục**, cuối script tổng kết `$ok`/`$fail` rồi `Read-Host`.
- Chỉ chứa ID từ catalog tĩnh; tên app escape nháy đơn (`'` → `''`); không tải mã từ xa.
- Nút “Sao chép lệnh” sinh one-liner nối bằng `; `.

### 6.4 Giao diện

- Modal dùng chung: giới thiệu, cảnh báo Windows/winget, ô tìm kiếm (bỏ dấu tiếng Việt), “Chọn bộ cơ bản”, “Bỏ chọn tất cả”, dòng đếm `aria-live`.
- Danh sách cuộn nội bộ (`max-height: min(46dvh, 500px)`), thanh hành động nằm ngay trên danh sách để luôn nhìn thấy; thẻ app có checkbox, nhà phát hành, mô tả, ghi chú và link “Trang chủ”.
- Nút “Tải script (.ps1)”, “Sao chép lệnh” disabled khi chưa chọn; `<details>` xem trước script; ghi chú UAC/SmartScreen/quyền bản quyền.
- Chỉ dùng token màu; 1 cột dưới 640px; copy có fallback `execCommand`.

### 6.5 Kết quả kiểm thử

| Hạng mục | Kết quả |
|---|---|
| `node scripts/check-catalog.mjs` | PASS — `OK: 34 apps / 9 categories (10 recommended)` |
| `tsc --noEmit` | PASS |
| `vite build` | PASS — 34 module; `index.html` 2,03 kB; CSS 32,37 kB (gzip 5,87); JS 85,21 kB (gzip 29,79); `gpu-worker` 2,84 kB; `cpu-worker` 0,73 kB |
| Script `.ps1` | `PARSE_OK` bằng `[scriptblock]::Create`; BOM `EF BB BF`; tên có `'` được escape đúng |
| Chrome 156 headless (CDP) | 7 thẻ/7 menu; modal 31 app/8 nhóm (trước khi thêm 3 tool); preset 10; tìm “zalo” còn 1; tải `.ps1` BOM chỉ chứa app đã chọn; copy hiện fallback khi clipboard bị chặn; đóng modal dọn `.sw`; 0 lỗi console |
| Edge 156 headless (CDP) | Lặp lại toàn bộ kiểm thử; viewport 360×640 không tràn ngang; ảnh chụp modal hiển thị đúng |
| Chrome + Edge sau khi thêm 3 tool | 34 app/9 nhóm; có nhóm “Công cụ kiểm thử”; tìm “furmark” còn đúng 1 app; 0 lỗi console |
| Firefox headless | Chưa hoàn tất: tiến trình treo trong môi trường sandbox, chưa có kết quả |
| `wingetId` | Đã đối chiếu các ID mới (Cốc Cốc, K-Lite, WinRAR, TeamViewer, UltraViewer, Zalo, UniKey, FurMark, Heaven, Cinebench R23) qua winstall/wingetly; toàn bộ ID cần xác minh lại bằng `winget show` trên máy có winget (sandbox chặn `winget.exe`) |

### 6.6 Giới hạn

- Chỉ Windows 10 1809+/11 có winget (App Installer); không hỗ trợ macOS/Linux.
- Không tạo `.exe`, không tự chạy; người dùng phải tự chạy file và có thể gặp UAC/SmartScreen.
- WinRAR/TeamViewer có điều kiện bản quyền; K-Lite chỉ chọn bản Standard.
- Danh mục là dữ liệu tĩnh, không tự cập nhật phiên bản; chạy lại script để cập nhật app.

## 7. Kết quả kiểm thử (thực hiện **trước khi** push)

| Hạng mục | Kết quả |
|---|---|
| Chrome headless quick (`?quick`, SwiftShader) | CPU 85 · GPU 56 phép tính/µs · 0 lỗi console · 0 tràn ngang |
| Chrome bản đầy đủ | CPU 126 phép tính/µs (9–11 s) |
| Chrome + GPU thật (`--use-angle=d3d11`, GTX 1660 Ti) | **GPU 100 052 phép tính/µs** trong 0:40 · tiến độ 19% ở giây thứ 8 · nút "Dừng" cho kết quả "Đã dừng benchmark." · đóng modal sạch |
| Firefox 159 (WebDriver BiDi, GTX 980) | CPU 74 (0:18) · **GPU 94 901** (0:44) · stress start/stop OK · 0 lỗi |
| Đường dự phòng main-thread (`?mainthread=1`) | GPU bench chạy xong (22 phép tính/µs, thấp hơn vì tính cả khoảng rảnh rAF) · storm dừng được |
| Stress CPU & GPU | start → "đang chạy" → "Dừng" OK trên cả Chrome lẫn Firefox |
| `npm run build` | PASS — 28 module; JS 67,36 kB, CSS 28,57 kB, `gpu-worker` 2,84 kB, `cpu-worker` 0,73 kB |
| `npm run check:catalog` (công cụ phần mềm) | PASS — `OK: 34 apps / 9 categories (10 recommended)` |
| `vite build` sau khi thêm công cụ phần mềm | PASS — 34 module; CSS 32,37 kB (gzip 5,87); JS 85,21 kB (gzip 29,79) |
| Script `.ps1` sinh thử | `PARSE_OK`; BOM `EF BB BF`; escape `Bob''s Tool` đúng |
| `wingetId` (34 app) | Đã tra cứu qua winstall/wingetly/winget.ragerworks; chưa chạy `winget show` vì sandbox chặn `winget.exe` |

Công cụ kiểm thử: Chrome headless qua CDP (`Input.dispatchMouseEvent` thật, `Runtime.evaluate` đọc trạng thái) và Firefox qua WebDriver BiDi (Firefox chỉ có `ws://127.0.0.1:<port>/session`, không có route `/json/version`).

## 8. Quy trình build & phát hành

```bash
npm install        # cài thư viện
npm run dev        # chạy thử (localhost là secure context → camera/mic hoạt động)
npm run check:catalog # kiểm tra catalog phần mềm
npm run build      # kiểm tra kiểu + catalog + build ra dist/  (bắt buộc trước khi báo xong)
npm run preview    # xem bản build
```

- Push lên `main` → workflow `.github/workflows/deploy.yml` tự build và đăng GitHub Pages.
- Run đã thành công: **41004260845** — *Deploy to GitHub Pages* (commit `a6cc287`).
- Kiểm tra bản live: bundle chứa `uLoop / 5466587 / 5e7 / mainthread`, hai worker chunk trả HTTP 200 tại `/mqhwtest/assets/…`, chạy CDP quick trên URL thật → CPU 90 · GPU 37 (SwiftShader headless) · stress start/stop OK · không lỗi.

## 9. Quy tắc bắt buộc (rút gọn từ `AGENTS.md`)

1. Không backend, không API ngoài, không analytics, không cookie theo dõi; ảnh camera và âm thanh micro không bao giờ rời khỏi máy.
2. Chỉ TypeScript + CSS thuần; thêm thư viện phải có lý do rõ ràng, ưu tiên API trình duyệt.
3. Mỗi bài kiểm tra là module độc lập trong `src/modules/<id>/`, đăng ký trong `registry.ts`.
4. Màu, font, bo góc, bóng chỉ lấy từ `src/styles/tokens.css`; `--text-soft` chỉ dùng cho chữ ≥ 18 px.
5. Một bảng màu tối duy nhất ở cả chế độ sáng/tối của hệ điều hành.
6. Đường dẫn tài nguyên tương đối (`import.meta.env.BASE_URL`) vì site nằm ở `/<repo>/`.
7. Tôn trọng `prefers-reduced-motion` và `prefers-reduced-transparency`.
8. Giao diện tiếng Việt; tên biến/hàm/commit tiếng Anh.
9. Luôn `track.stop()` mọi MediaStream khi rời bài kiểm tra hoặc đóng trang.
10. API không hỗ trợ phải phát hiện và có phương án thay thế.
11. Hoàn thành khi `npm run build` không lỗi, bài kiểm tra/công cụ chạy được trên Chrome và ít nhất một trình duyệt khác, và đã xử lý trường hợp bị từ chối quyền / không có thiết bị.
12. Danh mục phần mềm chỉ dùng app miễn phí/freemium với `wingetId` đã xác minh; script xem trước được, chỉ chứa lệnh tĩnh, không tải mã từ xa.

## 10. Skill OpenCode (`.opencode/skills/`)

| Skill | Phạm vi |
|---|---|
| `apple-brown-design` | Quy tắc giao diện Apple, chữ nâu nhạt |
| `keyboard-tester` | Bàn phím US ANSI, PC và MacBook |
| `speaker-tester` | Loa: file quét dải trầm/bổng + 2 bản nhạc mẫu, kênh trái/phải |
| `camera-mic-tester` | Camera và microphone |
| `display-tester` | Màn hình toàn màn hình: màu thuần, điểm chết, dải xám, chuyển động |
| `bench-tester` | CPU & GPU: kiểm tra tải + benchmark, công thức điểm, knob kiểm thử |
| `software-installer` | Danh mục phần mềm, script winget, quy tắc an toàn và kiểm thử |
| `github-pages-deploy` | Phát hành lên GitHub Pages |

## 11. Giới hạn đã biết

- **Tải benchmark là synthetic**: chỉ là một dải toán song song, không đại diện cho ứng dụng thật.
- **Điểm phụ thuộc trình duyệt**: Chrome/Edge/Firefox cho khác điểm trên cùng một phần cứng.
- **Cần giữ tab đang mở** (focus) khi chạy benchmark để kết quả đúng.
- **Dừng stress GPU** có thể phải đóng cửa sổ trình duyệt nếu không hỗ trợ OffscreenCanvas (đã có đường dự phòng chạy trên tab chính).
- **Điểm CPU không so sánh được** với bảng tham khảu của mprep (số vòng lặp khác).
- **Không đọc được nhiệt độ / điện áp / công suất** phần cứng trong trình duyệt (khác với phần mềm native như HWMonitor/FurMark).
- **Công cụ phần mềm chỉ chạy trên Windows** có winget; không tạo được `.exe` như Ninite, người dùng phải tự chạy file `.ps1` và có thể gặp UAC/SmartScreen.
- **Danh mục là dữ liệu tĩnh**: không tự cập nhật phiên bản; WinRAR là bản dùng thử, TeamViewer miễn phí cho cá nhân.

## 12. Ghi công & tham khảo

- Module CPU & GPU lấy cảm hứng về **kỹ thuật** từ trang **https://mprep.info/gpu/** (Stress My GPU) — trang dùng thư viện **gpu.js v2.11.3** (bản sửa, đổi tên `GPU` → `GPUX`) để biên dịch kernel JS thành fragment shader WebGL, kèm 5 worker nhỏ. Toàn bộ shader, worker và công thức trong dự án này **được viết lại từ đầu**, không nhúng hay sao chép mã của họ, và **không** gọi bảng điểm `.tsv` của mprep (vi phạm quy tắc "không gọi API ngoài").
- Mã nguồn gpu.js: https://github.com/gpujs/gpu.js (MIT).
- Công cụ Cài phần mềm lấy cảm hứng UX từ **https://ninite.com/** (chọn app → tải một file) và tham khảo cách tổ chức catalog của **https://winstall.app/**; mã nguồn trong dự án này được viết độc lập, không sao chép.

---

## Phụ lục — Bản đồ file theo module

```
src/modules/keyboard/     detect.ts · keyboard.ts · layout.ts · keyboard.css
src/modules/speaker/      speaker.ts · tracks.ts · speaker.css
src/modules/camera/       camera.ts · camera.css
src/modules/microphone/   microphone.ts · microphone.css
src/modules/display/      display.ts · display.css
src/modules/bench/        bench.ts · gpu-gl.ts · gpu-worker.ts · cpu-worker.ts · bench.css
src/modules/software/     catalog.json · catalog.ts · install-script.ts · software.ts · software.css · index.ts
scripts/                  check-catalog.mjs
public/audio/             speaker-sweep.mp3 · speaker-test-1.mp3 · speaker-test-2.mp3
public/                   logo.png
.opencode/skills/         ... + software-installer/SKILL.md
```

> Ghi chú: thư mục `.opencode/opencode-loop/` là artefact cục bộ của phiên làm việc, **không** được commit.
