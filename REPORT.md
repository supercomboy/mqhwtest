# Báo cáo audit UI — Device Check

> ⚠️ **DEGRADED: single-context (Assessment A và Assessment B không chạy trong hai sub-agent độc lập; toàn bộ đánh giá do một ngữ cảnh thực hiện)**

- **Ngày:** 2026-11-03
- **Phạm vi:** toàn bộ giao diện đang chạy ở `http://localhost:5173` (trang chủ + 4 trang landing `/test-*` + 7 bề mặt công cụ trong modal)
- **Chế độ:** **Persuade** cho trang chủ và 4 trang `/test-*`; **Operate** cho 7 bề mặt công cụ
- **Thay đổi mã nguồn:** **không có** (theo yêu cầu — báo cáo thuần, không sửa code)
- **Thiết bị quét:** `impeccable.exe` engine **v4.8.0**, bộ **62 luật** (`detect --list-rules`) + **Hallmark v2.0.0** `scripts/sloplint.mjs` (chế độ tĩnh và `--render`)
- **Số lượt quét:** Impeccable 40 (5 trang × 8 viewport) + 6 (3 modal × 2 viewport); Hallmark 1 lượt tĩnh (15 file) + 1 lượt render 5 URL × 8 độ rộng (25 ảnh chụp)

---

## 0. Phương pháp, và một đính chính

### 0.1 Về "sloplint của Hallmark"

**Đính chính:** bản đầu của báo cáo này ghi rằng entity `【entity-Hallmark¦canonical_name=Hallmark】` và công cụ `sloplint` không tồn tại trong môi trường, nên đã dùng bộ 62 luật của Impeccable thay thế. Điều đó **không còn đúng**: Hallmark là một skill thật (`nutlope/hallmark`, MIT, v2.0.0) và đã được cài vào dự án tại `.agents/skills/hallmark/`. Toàn bộ §5 dưới đây **là kết quả thật của `sloplint.mjs`**, không còn là phần thay thế.

Hai công cụ được chạy độc lập, không dùng kết quả của nhau:

| Công cụ | Cách chạy | Phạm vi | Kết quả |
|---|---|---|---|
| **Impeccable** `detect` | Chrome headless + CDP, `--json` | 5 trang × 8 viewport + 3 modal × 2 viewport | **51 phát hiện**, 4/62 luật bắn (§2) |
| **Hallmark** `sloplint.mjs` (tĩnh) | `node scripts/sloplint.mjs index.html test-*/index.html src` | 15 file HTML/CSS/TS | **25 FAIL, 99 REFLEX, 14 WARN** (§5.1) |
| **Hallmark** `sloplint.mjs --render` | `--render` + 5 URL, tự chạy 8 độ rộng | 320 / 375 / 414 / 768 / 1024 / 1280 / 1440 / 1920 | **8 FAIL, 22 REFLEX, 9 WARN**, 25 ảnh chụp (§5.2) |

Hallmark render đúng 8 độ rộng được yêu cầu: `sloplint-render.mjs:6` khai báo `WIDTHS = [320, 375, 414, 768, 1024, 1280, 1920]` và thêm một lượt đo không gian ở `1440×900` + `1920×1080` — hợp lại đúng dải 320 → 1920. Ảnh chụp nằm ở `.hallmark/shots/` (đã gitignore).

Ba tầng "gate" của Hallmark có nghĩa khác nhau, cần đọc đúng khi ưu tiên sửa:

- **FAIL** = tầng *Floor* — không được phép ship. Đây là các mục P0/P1 của báo cáo.
- **REFLEX** = tầng *Reflex* — mặc định nên tránh, nhưng có thể giữ nếu có lý do. Đây là P2.
- **WARN** = tầng *Finish* — đánh bóng. Đây là P3.

Impeccable và Hallmark **không trùng nhau**: 4 luật Impeccable bắn đều là lỗi chữ (dòng dài, chạm mép, straggler, heading lệch); 25 FAIL của Hallmark là lỗi cấu trúc và tương tác (thiếu `:focus-visible`, ẩn nội dung bằng script, phá sticky, màu ngoài token). Hai bộ bổ sung cho nhau, không thay thế nhau.

### 0.2 Vì sao phải đi đường vòng CDP

`impeccable detect <url>` tự mở Chrome bằng profile tạm và **luôn thất bại trên máy này**:

```
Error: Failed to create a temporary browser profile: Access is denied. (os error 5)
```

Đã thử override `TEMP` / `TMP` / `TMPDIR` / `HOME` — không được. Cách chạy được (và là cách đã dùng cho cả 46 lượt quét):

```powershell
chrome --headless=new --remote-debugging-port=9401 --user-data-dir=<prof> --window-size=W,H <url>
impeccable.exe detect --cdp 9401 --target localhost:5173 --json
```

### 0.3 Viewport và cách ly trạng thái

8 viewport: **320×568, 375×812, 414×896, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080**.

Trước khi quét: cuộn hết trang xuống rồi lên để `.reveal` (IntersectionObserver) bắn xong — nếu không, mọi thứ dưới màn đầu sẽ bị đo ở trạng thái `opacity: 0` và kết quả sai.

---

## 1. Tóm tắt điều hành

**Kết luận: 6/10 về kỹ thuật, 3/10 về bản sắc thiết kế.**

Phần "chất lượng kỹ thuật" của dự án tốt hơn mức trung bình rõ rệt: tương phản 12–14:1 cho chữ, có nhánh dự phòng cho `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast`, focus trap + ESC cho modal, nút đóng 44px, `#tool { min-height }` chống CLS. Bộ 62 luật của Impeccable chỉ bắn **4 luật** trên 46 lượt quét — và cả 4 đều là lỗi *chữ* (dòng quá dài, chạm mép, straggler, heading lệch), không phải lỗi cấu trúc.

Hallmark thì bắn mạnh hơn hẳn — **25 FAIL + 99 REFLEX + 14 WARN** khi quét tĩnh, và **8 FAIL** khi render ở 8 độ rộng — và bắt đúng những thứ Impeccable bỏ sót: **không có `:focus-visible` ở bất kỳ đâu**, `.reveal` ẩn nội dung bằng script, `overflow-x: hidden` phá sticky của nav, viền `select` chỉ 1.55:1. Con số 4 so với 25 nói lên điều quan trọng: **bộ 62 luật không phải là một cuộc audit đầy đủ**, nó chỉ là lớp lưới đầu tiên.

Nhưng đúng những gì cả hai máy **không** bắt được lại là chỗ yếu nhất:

- Trang chủ là **"generic product page"** theo đúng định nghĩa anti-pattern của `mode-persuade.md`: tiêu đề giữa + subcopy + một nút, bên dưới là hàng thẻ bằng nhau. Không có một mẩu bằng chứng sản phẩm nào ở màn đầu.
- 7 thẻ công cụ **hoàn toàn đồng nhất**: không icon, không ảnh, không số thứ tự, không nhóm — người dùng phải đọc 7 câu gần giống nhau để phân biệt.
- 4 trang landing có **một lỗi CSS làm vỡ giao diện thật**: 2 link đầu trang rơi về style mặc định của trình duyệt (xanh dương, gạch chân) — P0, xem §3.1.
- Toàn bộ chữ dùng font hệ điều hành, **không nạp webfont** → macOS ra SF Pro, Windows ra Segoe UI. "Chất Apple" không do dự án kiểm soát.
- **Site không hỏng ở mobile — nó hỏng ở desktop.** Hallmark sạch ở 320/375/414/768/1024, rồi bung ra toàn bộ ở 1280 và 1440 (§5.3).

Điểm mạnh thật: bảng màu nâu đậm + kem là một quyết định có lý lẽ và có tài liệu ngay trong `tokens.css`; nó *không* phải "AI slop tím–cyan". Vấn đề không phải màu, mà là **bố cục và bằng chứng**.

---

## 2. Ma trận phát hiện (62 luật × 8 viewport)

### 2.1 Số phát hiện theo trang × viewport

| Trang | 320 | 375 | 414 | 768 | 1024 | 1280 | 1440 | 1920 | Tổng |
|---|---|---|---|---|---|---|---|---|---|
| Trang chủ | 2 | 0 | 8 | 4 | 3 | 5 | 5 | 5 | **32** |
| `/test-ban-phim/` | 5 | 5 | 5 | 2 | 2 | 0 | 0 | 0 | **19** |
| `/test-loa/` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| `/test-micro/` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| `/test-camera/` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |

Cộng thêm 4 phát hiện chỉ lộ ra ở lượt quét có modal/cuộn trang (§2.4). **Tổng: 55 dòng phát hiện.**

Nhận xét quan trọng: 3/5 trang **sạch tuyệt đối ở cả 8 viewport**. Đây không phải trang lỗi; đây là trang *nhạt*.

Đối chiếu với Hallmark (§5): đúng 3 trang đó (loa, micro, camera) lại **không** sạch — Hallmark FAIL ở `/test-loa/` (H1 dưới màn, select 1.55:1, 234 từ/màn) và `/test-micro/` (H1 dưới màn, 200 từ/màn). Nói cách khác, "sạch" ở bảng trên chỉ có nghĩa "không vi phạm 62 luật chữ của Impeccable", **không** có nghĩa "không có vấn đề". Đừng đọc bảng này như một giấy chứng nhận.

### 2.2 Bốn luật đã bắn (chi tiết đầy đủ)

#### (1) `body-text-viewport-edge` — 23 phát hiện

Chữ chạm mép viewport. Ngưỡng khuyến nghị ≥16px mỗi bên.

| Trang | Viewport | Selector | Nội dung | Lề đo được |
|---|---|---|---|---|
| ban-phim | 320 / 375 / 414 | `p.intro` | 268 ký tự | left 12px / right 12px |
| ban-phim | 320 / 375 / 414 | `p:nth-of-type(2)` | 318 ký tự | 12px / 12px |
| ban-phim | 320 / 375 / 414 | `p:nth-of-type(3)` | 228 ký tự | 12px / 12px |
| ban-phim | 320 / 375 / 414 | `p.start-note` | 128 ký tự | 12px / 12px |
| ban-phim | 320 / 375 / 414 | `ul:nth-of-type(2) > li:nth-of-type(4)` | 121 ký tự | right 12px |
| home | 414 | `p.hero__sub` | 152 ký tự | left 8px / right 8px |
| home | 414 | `.seo p:nth-of-type(1)` | 306 ký tự | 8px / 8px |
| home | 414 | `.seo p:nth-of-type(2)` | 202 ký tự | 8px / 8px |
| home | 414 | `.seo p:nth-of-type(3)` | 251 ký tự | 8px / 8px |
| home | 414 | `section.privacy p` | 170 ký tự | 8px / 8px |
| home | 414 | `li:nth-of-type(1..4)` | 107 / 118 / 121 / 90 ký tự | 8px / 8px |

Nguyên nhân: `main { padding: 0 16px }` nhưng ở 414px có thành phần phá ra ngoài gutter (`.hero__sub` max-width 560px, `.seo` không có padding riêng), còn `.page { padding: 0 16px }` bị `@media (max-width:640px)` ép xuống `12px`.

#### (2) `line-length` — 15 phát hiện

Dòng chữ quá dài để mắt bắt nhịp (khuyến nghị <80 ký tự/dòng).

| Trang | Viewport | Selector | Số ký tự |
|---|---|---|---|
| home | 768 | `.seo p` ×3 | ~100 / ~101 / ~103 |
| home | 1024 | `.seo p:nth-of-type(1)`, `p:nth-of-type(3)` | 135 / 136 |
| home | 1280, 1440, 1920 | `.seo p:nth-of-type(1)` | **~146** |
| home | 1280, 1440, 1920 | `.seo p:nth-of-type(3)` | **~147** |
| ban-phim | 768 | `p` ×2 | 96 / 101 |
| ban-phim | 1024 | `p` ×2 | 129 / 136 |
| home (modal pass) | 1440 | `p.bench__hint` | **165** |

Đây là phát hiện **có sức nặng nhất về đọc hiểu**: 146 ký tự/dòng là gấp 1,8 lần giới hạn đọc thoải mái. Ở 1920px, cột chữ vẫn kéo hết 1080px của `main` thay vì co lại ~68ch.

#### (3) `straggler` — 10 phát hiện

Dòng cuối chỉ còn một từ, tạo lỗ hổng dưới khối chữ.

| Trang | Viewport | Selector | Từ mồ côi | % độ đo |
|---|---|---|---|---|
| home | 320 | `section.privacy p` | "này." | 7% |
| home | 320 | `#microphone > p` | "lại." | 5% |
| home | 768 | `li:nth-of-type(2)` | "mẫu." | — |
| home | 1024 | `#speaker > p` | "phải." | 15% |
| home | 1280/1440/1920 | `#software > p` | "winget." | 20% |
| home | 1280/1440/1920 | `#keyboard > p` | "lên." | 10% |
| home (modal pass) | 375 | `section.bench__section:nth-of-type(2) > p.bench__desc` | "này." | 9% |
| home (modal pass) | 375 | `p.sw__note:nth-of-type(2)` | "chạy." | 9% |

Lưu ý: 6/10 straggler nằm ngay trong **thẻ và ghi chú của công cụ** — tức là chỗ người dùng đọc kỹ nhất.

#### (4) `unbalanced-heading` — 3 phát hiện (+1)

| Trang | Viewport | Selector | Chi tiết |
|---|---|---|---|
| home | 1280 / 1440 / 1920 | `h1` | dòng cuối chỉ bằng **34%** dòng trên |
| home (modal pass) | 375 | `section.privacy.reveal > h2` | dòng cuối bằng **15%** dòng trên |

`h1` hiện tại là `"Kiểm tra thiết bị online: bàn phím, loa, mic, camera."` — ở desktop nó ngắt thành 2 dòng, dòng 2 lơ lửng một cụm ngắn. Không có `text-wrap: balance`.

### 2.3 58 luật không bắn

Toàn bộ 58 luật còn lại trả 0 phát hiện trên 46 lượt quét. Chia làm ba nhóm:

**Nhóm A — Thật sự sạch (đã kiểm tra bằng mắt, đồng ý với máy):**
`side-tab`, `border-accent-on-rounded`, `gradient-text`, `ai-color-palette`, `nested-cards`*, `monotonous-spacing`, `bounce-easing`, `pulsing-dot`, `blinking-cursor`, `shape-assembled-illustration`, `organic-clip-path`, `buried-raster`, `hard-offset-shadow`, `dark-glow`, `radial-spotlight-glow`, `marquee`, `icon-tile-stack`, `italic-serif-display`, `hero-eyebrow-chip`, `kicker-above-heading`, `numbered-section-labels`, `em-dash-overuse`, `marketing-buzzword`, `aphoristic-cadence`, `oversized-h1`, `extreme-negative-tracking`, `broken-image`, `script-error`, `edge-flush-cards`, `text-occlusion`, `first-viewport-column-overflow`, `gray-on-color`, `low-contrast`, `cramped-padding`, `tight-leading`, `justified-text`, `tiny-text`, `undersized-ui-text`, `all-caps-body`, `wide-tracking`, `text-overflow`, `repeated-container-text`, `repeating-stripes-gradient`, `codex-grid-background`, `theater-slop-phrase`, `gpt-thin-border-wide-shadow`, `design-system-font`†, `design-system-color`†, `design-system-radius`†, `design-system-font-size`†

\* `nested-cards` **không bắn nhưng mắt thấy có** — xem §5.4.
† Bốn luật `design-system-*` không chạy vì dự án không có `DESIGN.md` / `.impeccable/design.json` (`impeccable context` trả `NO_PRODUCT_MD` + `EXISTING_VISUAL_SYSTEM`). Không phải "sạch", mà là **không được kiểm tra**.

**Nhóm B — Đúng là không áp dụng cho trang này:**
`hero-eyebrow-chip`, `kicker-above-heading`, `numbered-section-labels`, `marquee`, `codex-grid-background`, `repeating-stripes-gradient`, `shape-assembled-illustration`, `organic-clip-path`, `icon-tile-stack`, `italic-serif-display`.

**Nhóm C — Máy bỏ sót (false negative) — đây là phần quan trọng nhất:**

| Luật | Máy | Mắt thấy | Đánh giá |
|---|---|---|---|
| `content-hidden-at-rest` | 0 | `.reveal { opacity: 0 }` áp lên **cả 7 thẻ + section SEO + privacy**; chỉ hiện khi JS chạy và IntersectionObserver bắn | **Bỏ sót thật.** JS lỗi/bị chặn = trang chủ trắng nội dung. P0. |
| `cream-palette` | 0 | Nền nâu `#1d1b19` + chữ kem `#ffe2b8` | Không bắn là **đúng** — luật này nhắm nền kem sáng (trend "#F5F1E8"), không nhắm chữ kem trên nền tối. Ghi lại để người sau không hiểu nhầm. |
| `radial-halo` | 0 | `body::before` có **3 vệt radial-gradient** (46%×40% @12% 14%, 52%×44% @88% 6%, 60%×50% @70% 94%) | Không trúng ngưỡng nhưng **đúng hình thái** slop. Vệt này tồn tại chỉ để lớp kính của modal có thứ để làm mờ. P2. |
| `overused-font` | 0 | Stack `-apple-system, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, 'Segoe UI', Roboto` | Không bắn vì máy này **không cài Inter** (0 file `Inter*` trong `C:\Windows\Fonts` và font user) → rơi tiếp xuống `system-ui`/Segoe UI. Vấn đề thật không phải "font bị overused" mà là **không nạp webfont**: macOS ra SF Pro, Windows ra Segoe UI. Nhận diện đổi theo máy người dùng. P1. |
| `skipped-heading` | 0 | 4/7 thẻ có tiêu đề là `<a>` (**không có heading nào**), 3/7 là `<h2>` | Detector coi `<a>` là text thường nên outline "hợp lệ" trên giấy. Thực tế: outline của trang chủ thiếu 4 mục. P1. |
| `gpt-thin-border-wide-shadow` | 0 | `.card` = shadow rộng + không viền; `.tool-wrap` = `1px solid var(--line)` + shadow rộng | Gần đúng nhưng không trùng công thức. Ghi nhận mức P3. |

### 2.4 Phát hiện chỉ có khi mở modal (3 dòng mới)

| Modal | Viewport | Luật | Selector | Chi tiết |
|---|---|---|---|---|
| CPU & GPU | 1440 | `line-length` | `p.bench__hint` | **165 ký tự/dòng** — dài nhất toàn site |
| CPU & GPU | 375 | `straggler` | `p.bench__desc` | "này." (9%) |
| Phần mềm | 375 | `straggler` | `p.sw__note:nth-of-type(2)` | "chạy." (9%) |

---

## 3. Persuade — trang chủ + 4 trang `/test-*`

Tiêu chí của `mode-persuade.md`: *"phần mở đầu phải làm cho lời chào hàng hiểu được và đáng muốn, bộc lộ một hành động rõ ràng, và chứng minh được một điều chỉ sản phẩm này chứng minh được"*. Anti-pattern được nêu đích danh: *"trang sản phẩm generic (một tiêu đề trên subcopy và một nút, bên dưới là một hàng thẻ bằng nhau)"* và *"một thế giới bị rút gọn thành một màu nhấn trên template trung tính"*.

### 3.1 P0 — Lỗi CSS làm vỡ đầu trang của **cả 4 trang landing**

```html
<!-- test-ban-phim/index.html:26-29 -->
<header class="page">
  <a href="../index.html" class="page__brand">← Trang chủ</a>
  <a href="https://coniccomputer.com/">Sửa máy tính Conic</a>
</header>
```

```css
/* src/pages/page.css:8-25 */
.page header { display:flex; align-items:center; justify-content:space-between;
               gap:16px; padding:12px 0 40px; border-bottom:1px solid var(--line); }
.page header a { color:var(--text); text-decoration:none; font-weight:500; }
```

Class `page` nằm **trên chính `<header>`**, nhưng CSS viết `.page header` (cần một `<header>` *con*). Kết quả:

- `.page header { display:flex; border-bottom }` **không áp dụng** → không có đường kẻ phân cách, 2 link xếp chồng theo block.
- `.page header a { color: var(--text); text-decoration: none }` **không áp dụng** → 2 link rơi về style mặc định của trình duyệt: **xanh dương, gạch chân**.

Đã xác nhận bằng ảnh render `v-kp-375.png`: "← Trang chủ" và "Sửa máy tính Conic" hiện màu xanh link mặc định trên nền nâu. Đây là họ màu **duy nhất** trên site không đến từ `tokens.css`, và nó nằm ở vị trí đầu tiên người dùng nhìn.

Ảnh hưởng: cả 4 trang `/test-ban-phim/`, `/test-loa/`, `/test-micro/`, `/test-camera/`.

### 3.2 P0 — Khung công cụ đứng **trên** `<h1>`

```html
<div class="page">
  <div id="tool"></div>        <!-- min-height: 200px -->
  <h1>Test bàn phím online</h1>
  <p class="intro">…</p>
```

`#tool { min-height: 200px }` (giữ chỗ chống CLS — quyết định đúng) nhưng nó nằm **trước** tiêu đề. Hệ quả:

- Lần vẽ đầu tiên: **một khối rỗng 200px** phía trên tiêu đề trang.
- Thứ tự đọc (và thứ tự tab): điều khiển chính → tiêu đề → mô tả. Screen reader đọc "Test bàn phím" sau khi đã đi qua vùng công cụ.
- `<h1>` bị đẩy xuống dưới màn đầu trên mobile.

### 3.3 Nội dung thẻ mô tả sai sản phẩm

`src/modules/registry.ts`, module `software`:

> "Chọn phần mềm cần cài và tải một script **PowerShell** cài hàng loạt bằng winget."

Nhưng sản phẩm đã chốt (và modal đang nói đúng): **một file `.bat` duy nhất**, `AGENTS.md` ghi rõ "File cài sinh ra là **một file `.bat` duy nhất**". Đây là copy tồn đọng từ phiên bản trước — người dùng đọc thẻ sẽ tưởng phải mở PowerShell.

### 3.4 Không có một mẩu bằng chứng sản phẩm nào ở màn đầu

`v-home-1440.png`:

```
        Kiểm tra thiết bị online: bàn phím, loa, mic, camera.        ← h1, căn giữa
   Bàn phím, loa, camera, microphone, màn hình, CPU & GPU — và ...     ← subcopy 21px
                     [ Bắt đầu kiểm tra ]                              ← nút kem, chỉ scroll #tests
   ─────────────────── khoảng trống ~70px ───────────────────
   [Bàn phím]        [Loa]           [Camera]                          ← 3 thẻ giống nhau
```

Không có: ảnh bàn phím sáng phím, waveform của micro, khung preview camera, biểu đồ điểm benchmark, ảnh chụp công cụ phần mềm. Với một sản phẩm mà **toàn bộ giá trị nằm ở việc nhìn thấy thiết bị hoạt động**, đây là chỗ mất điểm lớn nhất.

Nút CTA chính `[Bắt đầu kiểm tra]` chỉ `href="#tests"` — cuộn xuống danh sách. Nó không mở bài kiểm tra nào. Theo `mode-persuade.md`, một liên kết trang trí dẫn tới hành động không được tính là chuyển đổi.

### 3.5 Thẻ: 7 thẻ đồng nhất, không có hệ thống phân cấp

| Thẻ | Tiêu đề là | Icon | Ảnh | Nhóm |
|---|---|---|---|---|
| Bàn phím | `<a>` | ✗ | ✗ | ✗ |
| Loa | `<a>` | ✗ | ✗ | ✗ |
| Camera | `<a>` | ✗ | ✗ | ✗ |
| Microphone | `<a>` | ✗ | ✗ | ✗ |
| Màn hình | `<h2>` | ✗ | ✗ | ✗ |
| CPU & GPU | `<h2>` | ✗ | ✗ | ✗ |
| Phần mềm | `<h2>` | ✗ | ✗ | ✗ |

Ba vấn đề cùng lúc:

1. **Outline không nhất quán** — 4 thẻ không đóng góp heading nào. Điều hướng bằng heading (screen reader, "H" trong trình đọc) bỏ qua nửa danh sách.
2. **Hai đích bấm cạnh tranh trong mỗi thẻ** — tiêu đề là link, và bên dưới là nút ghost pill `[Mở bài kiểm tra]`. Cùng một hành động, hai phần tử, hai style.
3. **Không phân biệt được** — 7 khối cùng `padding:32px`, cùng `--surface`, cùng bán kính, cùng một câu mô tả, cùng một nút. Ở 320px, `v-home-320-full.png` cho thấy **7 khối giống hệt nhau xếp dọc** trong một lần cuộn rất dài.

Thêm: nút ghost **không thẳng hàng** giữa các thẻ trong cùng hàng (ở 1440, nút của thẻ 1 thấp hơn ~25px vì mô tả wrap 3 dòng còn thẻ 2–3 wrap 2 dòng). Không có cơ chế neo nút xuống đáy.

### 3.6 Màu nhấn trùng màu chữ

`tokens.css`: `--accent: #ffe2b8` **bằng đúng** `--text: #ffe2b8`. Nghĩa là site chỉ có **một** màu nhấn, và màu đó là màu chữ. Không có cách nào để nói "cái này quan trọng hơn cái kia" bằng màu. Hệ quả thấy rõ trong modal CPU & GPU: 4 nút `Nạp GPU / Nạp CPU / Nạp CPU & GPU / Dừng` trông **hoàn toàn ngang hàng**, dù "Nạp CPU & GPU" là hành động chính và "Dừng" là hành động thoát.

### 3.7 Logo là họ màu thứ ba

Logo trong nav (`.nav__brand img`, 805×216, đặt trên một "plate" sáng) là **mảng trắng gần như tinh khiết với chữ xanh dương + cyan "MQ TECH"**. Đây là:

- phần tử **sáng nhất** trên toàn trang (nền `#1d1b19`, logo ~`#fff`),
- họ màu **không tồn tại** trong `tokens.css` (xanh/cyan vs kem/nâu),
- thứ đầu tiên mắt bắt được — trước cả `<h1>`.

Trên nền nâu ấm, một tấm biển trắng lạnh nổi lên như dán vào. Về mặt kỹ thuật: logo là tài sản thương hiệu, không sửa được; nhưng **cách đặt** (plate trắng, 56px, không blend) là quyết định của site.

### 3.8 Điều hướng: cắt link mà không có dấu hiệu

`.nav__links { display:flex; gap:20px; overflow-x:auto }` — không ẩn scrollbar, không mask, không mũi tên.

| Viewport | Link bị cắt | Toạ độ |
|---|---|---|
| 320 | `Test loa` | L=291 R=335 (ngoài 320) |
| 375 / 414 | `Test micro` | L=355 R=415 |
| 768 | `Sửa máy tính Conic` | L=700 R=813 |

Ở 320–414, **"Test micro" là bài kiểm tra không thể với tới từ nav** trừ khi người dùng tình cờ vuốt ngang. Không có bóng mờ mép, không có dấu "…", không có gì gợi ý rằng còn nội dung. Thêm: `<span class="nav__brand-text">Device Check</span>` bị `display:none` dưới 480px → trên điện thoại chỉ còn tấm logo, mất hẳn tên sản phẩm.

Nav cũng không có trạng thái active / `aria-current`, và link ra ngoài (`coniccomputer.com`) không có dấu hiệu là link ngoài.

### 3.9 Không có webfont — nhận diện đổi theo hệ điều hành

`--font: -apple-system, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, 'Segoe UI', Roboto, sans-serif;`

Không có `@font-face`, không có `<link>` tới font. Trên Windows (máy kiểm tra): `-apple-system` không phân giải, `SF Pro` không có, `Inter` **không được cài** → rơi xuống `system-ui` = **Segoe UI**. Trên macOS: SF Pro.

Hệ quả: "kiểu Apple, chữ nâu nhạt" chỉ đúng trên máy Apple. Trên Windows — nơi phần lớn người dùng của một **công cụ kiểm tra phần cứng PC** đang đứng — nó là Segoe UI, tức là trông giống mọi trang Windows khác. Detector không bắt được vì luật `overused-font` chỉ nhắm tên font phổ biến *được khai báo và phân giải*, mà `Inter` thì không phân giải.

### 3.10 Chữ: 4 loại lỗi đọc hiểu đã đo được

1. **Dòng 146–147 ký tự** ở 1280/1440/1920 (§2.2-2): gấp 1,8× giới hạn đọc. `main { max-width:1080px }` không co cột chữ xuống ~68ch.
2. **Chữ chạm mép 8px** ở 414 (§2.2-1): `.hero__sub` và toàn bộ `.seo` / `.privacy` mất gutter.
3. **10 chỗ straggler** (§2.2-3): 6 trong số đó nằm trong thẻ/ghi chú công cụ.
4. **`h1` lệch** 34% (§2.2-4).

Trên `/test-ban-phim/` ở 375 (`v-kp-375.png`): `.intro` là **một đoạn 268 ký tự, kem sáng full-contrast 17px, không tách dòng, không tiểu mục** — một bức tường chữ duy nhất trước khi tới bất kỳ nội dung nào khác. Cộng với bố cục phẳng (toàn bộ là chữ trên nền nâu + một nút kem), trang landing không có điểm neo thị giác nào.

### 3.11 FAQ không có dấu hiệu mở/đóng

```css
.faq details { border:1px solid var(--line); border-radius:12px; padding:16px 18px; background:var(--surface-alt) }
.faq summary { list-style:none }
.faq summary::-webkit-details-marker { display:none }
```

Tam giác mặc định bị gỡ **và không có mũi tên thay thế**. Mỗi câu FAQ trông như một khối tĩnh; người dùng không biết bấm được. Đây là lỗi affordance, không phải lỗi thẩm mỹ.

### 3.12 Chi tiết nhỏ nhưng đáng ghi

- Hero dùng **em dash**: "…CPU & GPU — và cài phần mềm hàng loạt…" (luật `em-dash-overuse` không bắn vì chỉ 1 chỗ).
- Tên module **trộn ngôn ngữ**: "Bàn phím / Loa / Camera / Màn hình / Phần mềm" (Việt) đứng cạnh "Microphone" và "CPU & GPU" (Anh).
- JSON-LD `WebSite` khai báo `potentialAction: SearchAction` trỏ `%SITE_URL%/?q={search_term_string}` — nhưng site **không có ô tìm kiếm nào**. Structured data mô tả một tính năng không tồn tại.

---

## 4. Operate — 7 bề mặt công cụ

Tiêu chí của `mode-operate.md`: *"thế giới chỉ cho bốn thứ và chỉ bốn thứ: kiểu chữ, bảng màu, mật độ, và một động tác đặc trưng"*; *"một màn hình xám với một màu nhấn là mặc định của thể loại, không phải tiết chế"*; mức hoàn thiện = *"lưới thẳng hàng, khoảng cách nhất quán, thang chữ thật, phân cấp rõ"*.

Bảy bề mặt: bàn phím, loa, micro, camera, màn hình, CPU & GPU, phần mềm.

### 4.1 Mật độ thảm hoạ ở desktop (P2)

Modal `max-width:1280px`, panel rộng 1280px. Nội dung bên trong là **bảng 2 cột trải hết chiều rộng**:

| Modal | Cột nhãn | Cột giá trị | Khoảng trống giữa |
|---|---|---|---|
| Màn hình (1440) | x ≈ 107 | x ≈ 680 | **~573px** |
| CPU & GPU (1440) | x ≈ 133 | x ≈ 1300 | **~1167px** |

`v-modal-display-1440.png`: nhãn "Độ phân giải màn hình" ở mép trái panel, giá trị "1440 × 900" ở giữa, và **573px trống** ở giữa hai thứ phải đọc cùng nhau. `v-modal-bench-1440.png`: "Điểm GPU" ở x≈133, dấu "—" ở x≈1300.

Đây là lỗi Operate điển hình: panel rộng 1280px **không phải vì nội dung cần 1280px**, mà vì không có `max-width` cho phần thân. Một bảng 4 dòng bị kéo dài trên 1,2 mét màn hình.

### 4.2 Không có bằng chứng tiến trình (P2)

- **Màn hình**: dòng "Tần số quét (ước tính)" hiện "Đang đo…" — chữ tĩnh, không spinner, không phần trăm, không biết còn bao lâu.
- **CPU & GPU**: "Trạng thái: chưa chạy" + "Thời gian: 0:00" — có đồng hồ nhưng **không có tải thực tế** (không % CPU, không nhiệt độ, không biểu đồ). Người dùng bấm "Nạp CPU & GPU" và chỉ thấy số giây tăng.
- Sau khi bấm "Nạp CPU & GPU", **không có cách nào biết máy có đang thực sự chịu tải** — đúng thứ duy nhất bài kiểm tra này tồn tại để trả lời.

### 4.3 Bốn nút ngang hàng nhau (P2)

`v-modal-bench-1440.png`:

```
[ Nạp GPU ]  [ Nạp CPU ]  [ Nạp CPU & GPU ]  [ Dừng ]
[ Benchmark GPU ]  [ Benchmark CPU ]  [ Dừng ]
```

Cả 7 nút đều là `.btn--ghost` — cùng viền kem, cùng nền trong, cùng bo 980px. Không có primary/secondary. "Dừng" (hành động **huỷ**, cần tìm thấy ngay khi hoảng) trông y hệt "Nạp CPU & GPU" (hành động **chính**).

### 4.4 Thẻ lồng thẻ — luật không bắt, mắt thấy rõ (P2)

`v-modal-bench-1440.png` và `v-modal-software-1440.png`:

- Modal panel (bo góc, viền kính) → bên trong là **khối "Kiểm tra tải"** (bo góc, viền) + **khối "Benchmark"** (bo góc, viền) → bên trong khối lại là bảng. Ba tầng bo góc lồng nhau.
- Modal Phần mềm: panel kính → **lưới 4 cột thẻ ứng dụng** (mỗi thẻ bo góc + viền riêng) → trong thẻ là badge "Cơ bản". Thẻ lồng trong thẻ, lồng trong panel.

Luật `nested-cards` trả 0 — có thể vì panel dùng `--glass-bg` (bán trong suốt) nên bộ phân tích không coi là "card". Về thị giác, đây đúng là hiện tượng "hộp trong hộp" — dấu hiệu slop quen thuộc.

### 4.5 Nội dung bị cắt ở đáy panel (P2)

`v-modal-software-1440.png`: panel giới hạn `max-height: 92dvh`. Lưới ứng dụng cuộn tới nhóm "Văn phòng & PDF" thì **thẻ bị cắt ngang giữa thân** ở mép dưới panel (y≈775), không có bóng mờ, không có mũi tên, không có chỉ báo "còn nữa". Trên một màn hình 900px, người dùng thấy nửa thẻ và không chắc phần dưới có cuộn được.

### 4.6 Bottom sheet mobile: chuyển đổi tốt, nhưng mất ngữ cảnh

Ở 375, panel là bottom sheet `full-bleed` (375×710, top 103). Quyết định này **đúng** và rất iOS. Nhưng:

- Không có tay nắm (grabber) ở đỉnh sheet — người dùng không biết đây là sheet kéo được.
- Không có nút đóng ở vùng ngón tay cái; nút X nằm ở góc trên bên phải 44px, phải với tay.
- Tiêu đề modal ("CPU & GPU", "Màn hình", "Phần mềm") là chữ duy nhất cho biết đang ở đâu; trên sheet phủ gần hết màn hình, ngữ cảnh trang bị xoá hoàn toàn.

### 4.7 Nút đóng trên kính (P3)

`.modal__close { 44px; border:1px solid; background: trong suốt }` trên `--glass-bg` + `blur(20px)`. Đo bằng mắt trên `v-modal-display-1440.png`: vòng tròn viền mờ ~1px, độ tương phản với nền kính rất thấp — đúng kích thước (44px) nhưng **gần như vô hình**. Trong Operate, nút thoát là điều khiển quan trọng nhất sau hành động chính.

---

## 5. Hallmark `sloplint` — kết quả thật (25 FAIL tĩnh + 8 FAIL render)

### 5.1 Quét tĩnh — 25 FAIL, 99 REFLEX, 14 WARN trên 15 file

Đây là các lỗi **đọc được trong mã**, không phụ thuộc viewport. Tầng FAIL nghĩa là "không được ship".

| # | Gate | File:dòng | Vấn đề |
|---|---|---|---|
| 1 | `62` | `src/styles/main.css:237` | **`.reveal` ẩn ở trạng thái nghỉ (`opacity: 0`) và phụ thuộc script để hiện ra.** Toàn bộ 7 thẻ + khối SEO + khối privacy **vô hình** nếu JS lỗi hoặc bị chặn. Hallmark xác nhận độc lập đúng kết luận P0 của §3.5 |
| 2 | `26a` | 5 HTML + `bench.css:1` + `page.css:1` | **Không có `:focus-visible` ở bất kỳ đâu.** Bàn phím không có dấu hiệu focus nào ngoài outline mặc định của trình duyệt (mà `nav`, pill, thẻ đều ghi đè) |
| 3 | `34` | `src/styles/main.css:349` | `overflow-x: hidden` trên `body.is-locked` — **phá `position: sticky` của nav** khi modal mở (nav nhảy về đầu trang) |
| 4 | `48` | `src/styles/main.css:294` | Màu viết thẳng `rgba(255,255,255,0.18)` ngoài token — đúng chỗ `.modal__panel::before`, tức lớp "sheen" kính. Đây là màu duy nhất trên site không đến từ `tokens.css` |
| 5 | `10a` | `src/modules/bench/bench.css:80` | Transition trên `width` của `.bench__bar-fill` — animates layout, giật khi thanh chạy |
| 6 | `19` ×5 | `index.html:45`, 4 × `test-*/index.html:10` | Gạch ngang dài (`—` / `–`) trong copy. Cả 5 trang đều dính |
| 7 | `20` ×9 | `main.css:1`, `page.css:1`, 7 × `src/modules/*/*.css:1` | Không có "Hallmark stamp" ở dòng đầu file CSS. Mục này **không áp dụng** cho codebase có sẵn — bỏ qua |

14 WARN đáng chú ý:

- `41` ×3 (`main.css:410`, `:396`, `:201`): mặt tối (L 26%) **không đặt màu chữ** — `.modal__panel`, `.card` sống nhờ kế thừa từ `body`. Chỉ cần một lần đổi `body` là vỡ.
- `58` (`test-ban-phim:1`): **540 từ hiển thị** (ngưỡng 450). `test-loa:1`: **464 từ**.
- `58` (`index.html:44`): H1 dài **10 từ**; (`index.html:45`): đoạn hero dài **29 từ**.
- `F24` (`main.css:282`): viền hairline nằm dưới bóng mềm rộng trên `.modal__panel` — dấu hiệu "khung kính" ghép tay.
- `F3` ×2: **không có `text-wrap: balance`** trên bất kỳ heading hiển thị nào (`.page h1`, `h1`, `h2`) — đây là nguyên nhân gốc của `unbalanced-heading` mà Impeccable bắt ở §2.2.
- `F1` ×4: dấu nháy thẳng (`"`) trong văn xuôi: 10 chỗ ở `test-loa`, 4 ở `test-ban-phim`, 2 ở `test-micro`, 2 ở `test-camera`.

99 REFLEX gần như toàn bộ thuộc gate `24b` — khoảng cách/padding lệch thang 4px. Đây là lý do nhịp dọc "vừa thừa vừa thiếu": 0px chỗ này, 878px chỗ kia (§5.2).

### 5.2 Quét render — 8 FAIL, 22 REFLEX, 9 WARN ở 8 độ rộng

Đây là phần "nhìn AI slop / generic / chưa ưng" có số đo, không phải cảm nhận.

#### FAIL (không được ship)

| Gate | Độ rộng | Trang | Bằng chứng |
|---|---|---|---|
| `44b` | 1280×800 | `/test-loa/` | **H1 nằm dưới màn hình đầu** — đáy H1 ở y=1205 trong khung 800px |
| `44b` | 1280×800 | `/test-micro/` | **H1 nằm dưới màn hình đầu** — đáy H1 ở y=821 |
| `40` | 1440×900 | `/test-loa/` | **`select.spk__device-select` chỉ 1.55:1** so với nền quanh nó — viền ô chọn thiết bị gần như không thấy |
| `58` | 1440×900 | `/` | **196 từ trên một màn** (tính từ y=950) |
| `58` | 1440×900 | `/test-ban-phim/` | **253 từ trên một màn** (từ y=600) |
| `58` | 1440×900 | `/test-loa/` | **234 từ trên một màn** (từ y=1250) |
| `58` | 1440×900 | `/test-micro/` | **200 từ trên một màn** (từ y=850) |
| `58` | 1440×900 | `/test-camera/` | **216 từ trên một màn** (từ y=750) |

Ba điều đáng chú ý:

1. **`44b` là bằng chứng số học cho lỗi §3.2**: `#tool` (khung 200px đặt trước) nằm **trên** `<h1>`, nên ở 1280×800 tiêu đề trang bị đẩy khỏi màn đầu. Hallmark và Impeccable không nói cùng một ngôn ngữ nhưng cùng chỉ ra một lỗi.
2. **`40` (1.55:1) là lỗi tương phản thật duy nhất trên toàn site** — nằm trong bề mặt *Operate* (chọn thiết bị loa), tức chỗ người dùng phải bấm. Nó không nằm trong nhóm chữ nên 62 luật Impeccable không bắt.
3. **`58` bắn ở cả 5 trang** — "bức tường chữ" không phải cảm giác, mà là 196–253 từ/màn, gấp 4–5 lần lượng đọc thoải mái.

#### REFLEX — nhịp dọc và bố cục

| Gate | Độ rộng | Trang | Bằng chứng |
|---|---|---|---|
| `79` | 1440 | `/test-ban-phim/` | **878px trống** giữa nội dung cuối của hero (y=22) và màn hình |
| `79` | 1440 | `/test-loa/` | **712px trống** sau hero |
| `79` | 1440 | `/test-camera/`, `/test-micro/` | **363px trống** sau hero |
| `59` | 1440 | `/` | Khoảng cách nhỏ nhất giữa hai section là **0px** (các khoảng: 72, **0**, 120) |
| `59` | 1440 | `/test-loa/` | Khoảng nhỏ nhất **46px** giữa hai section (46 và 1352) |
| `44a` | 1440 | `/` | Hero đặt lệch: **96px phía trên, 72px phía dưới** |
| `44c` | 1440 | `/` | Hero kết thúc ở **576px** của màn 900px — nửa dưới trống |
| `44c` | 1440 | `/test-loa/`, `/test-micro/`, `/test-camera/` | Hero kết thúc ở **106px** của màn 900px |
| `25` | 1440 | `/`, `/test-ban-phim/` | Văn xuôi **102** và **106 ký tự/dòng** — vượt xa 80 |
| `78` | 1440 | `/` | Heading section render **32px** dưới một H1 **64px** — nhảy cóc, không có bậc trung gian |
| `77` | 1440 | `/` | 3 section "mỏng": "Màn hình" (rộng 100%, không có khối lượng), khối SEO (99%), khối privacy |
| `77` | 1440 | `/test-ban-phim/` | **Chỉ 1 section** (tính cả hero và footer) — trang một khối |
| `49b` | 375 / 320 | mọi trang | Link nav **"Test micro"** và **"Test camera" xuống 2 dòng** — nav cao lên bất thường |

Hai phát hiện `59` + `79` cộng lại mô tả đúng bản chất: **nhịp dọc vừa bị thổi phồng vừa bị bóp mất** trên cùng một trang. Trang chủ có hai section dính nhau 0px, trong khi trang bàn phím có 878px không có gì.

#### WARN — đánh bóng

- `F20` [1440] `section.grid` để **một thẻ lẻ loi ở hàng cuối (3 + 3 + 1)** — 7 thẻ không chia hết cho 3, và không có gì lấp chỗ trống đó.
- `F26` [1280] H1 trang chủ kết thúc bằng một từ mồ côi; [375] H2 "Dữ liệu không rời khỏi máy bạn" cũng vậy. Cùng gốc với `unbalanced-heading` của Impeccable (§2.2-4): thiếu `text-wrap: balance`.
- `F19` [1440] `/test-ban-phim/` dùng **4 độ đậm chữ** (400/500/600/700) trong văn bản chạy — nhiều hơn mức cần cho một trang chỉ có chữ.
- `77` ×4: số section mỗi trang chỉ 1–4, trong đó hero và footer bị tính vào — cấu trúc trang mỏng.

### 5.3 Ma trận theo độ rộng (Hallmark render)

| Độ rộng | FAIL | REFLEX / WARN nổi bật |
|---|---|---|
| **320** | 0 | `49b`: "Test micro" xuống 2 dòng |
| **375** | 0 | `49b`: "Test micro" / "Test camera" xuống 2 dòng; `F26`: H2 privacy kết thúc bằng stub |
| **414** | 0 | — (sạch) |
| **768** | 0 | — (sạch) |
| **1024** | 0 | — (sạch) |
| **1280** | 2 | `44b` ×2: H1 `/test-loa/` và `/test-micro/` nằm dưới màn đầu; `F26`: H1 trang chủ stub |
| **1440** | 6 | Toàn bộ `58`, `59`, `79`, `44a`, `44c`, `25`, `78`, `77`, `F19`, `F20` |
| **1920** | 0 | — (sạch; lượt đo không gian không thêm phát hiện) |

Đọc bảng này ra một kết luận quan trọng: **site không hỏng ở mobile — nó hỏng ở desktop**. 320 → 1024 gần như sạch, rồi 1280 và đặc biệt 1440 bung ra toàn bộ vấn đề. Đó là dấu hiệu của một bố cục được thiết kế cho cột hẹp rồi chỉ *kéo giãn* ra cho desktop, chứ không được thiết kế lại cho màn rộng: chữ chạy hết 1280px, section không có khối lượng, khoảng trống xuất hiện ở nơi đáng lẽ phải có nội dung.

### 5.4 Những gì **không** phải slop (để không sửa nhầm)

Cả hai công cụ đều xác nhận, không phải suy đoán:

- **Không có** gradient chữ, không có tím/cyan gradient, không có side-tab màu, không có icon-tile-stack, không có hard-offset-shadow, không có kẻ sọc `repeating-linear-gradient`, không có số thứ tự mục, không có eyebrow chip, không có marquee, không có blinking cursor, không có "theater slop phrase". Impeccable đúng ở cả 50 luật này.
- **Không có** tràn ngang: `scrollWidth === clientWidth` ở cả 8 viewport trên cả 5 trang, và Hallmark render cũng không báo gate tràn ngang nào. (Ảnh `chrome --screenshot --window-size` trông như bị cắt bên phải — đó là artifact của window frame, không phải lỗi trang.)
- **Không có** vấn đề tương phản chữ: 12–14:1 ở mọi nơi; `--text-soft` 7,6:1 và chỉ dùng ≥18px, đúng quy ước. Ngoại lệ duy nhất là viền `select` ở §5.2.
- **Không có** animation rẻ tiền: chỉ có `modal-in` 300ms và `.reveal` 16px, cả hai đều tắt theo `prefers-reduced-motion`.
- Bảng màu nâu-kem là **quyết định có lý lẽ** và có tài liệu trong `tokens.css` — không nên "làm mới" nó. Vấn đề nằm ở bố cục, bằng chứng và độ tương phản của control, không ở màu nền.

---

## 6. Nielsen — 10 heuristic (thang 0–4)

| # | Heuristic | Điểm | Căn cứ |
|---|---|---|---|
| 1 | Visibility of system status | **2** | Có "Đang đo…", có đồng hồ stress test — nhưng không có tiến trình, không có tải thực, nav không có active state |
| 2 | Match system ↔ real world | **3** | Tiếng Việt tự nhiên, thuật ngữ đúng; trừ vì trộn "Microphone"/"CPU & GPU" và copy "PowerShell" sai sự thật |
| 3 | User control and freedom | **2** | ESC + X 44px + focus trap (tốt); nhưng **không có `:focus-visible`** nên bàn phím mất dấu, nav cắt link không lối thoát, X gần vô hình, sheet không kéo được |
| 4 | Consistency and standards | **1** | Link xanh mặc định ở 4/5 trang; 4 thẻ dùng `<a>`, 3 thẻ dùng `<h2>`; mọi thứ là pill; logo ngoài bảng màu |
| 5 | Error prevention | **2** | `.bat` có xem trước + cảnh báo SmartScreen (tốt); không có xác nhận trước khi stress test nặng |
| 6 | Recognition rather than recall | **2** | 7 thẻ không icon/không nhóm — phải đọc hết 7 câu; nhãn và giá trị cách nhau 573px phải nhớ |
| 7 | Flexibility and efficiency | **2** | Có tìm kiếm trong công cụ phần mềm (tốt); trang chủ không có bộ lọc/nhóm, không phím tắt |
| 8 | Aesthetic and minimalist design | **2** | Sạch, không rối — nhưng sạch tới mức trống: không bằng chứng, không điểm neo |
| 9 | Error recovery | **2** | Script báo lỗi theo từng app + gợi ý khắc phục (rất tốt); chưa thấy trạng thái lỗi khi từ chối quyền camera/micro trong ảnh chụp — **cần kiểm tra riêng** |
| 10 | Help and documentation | **3** | FAQ + khối SEO + footer liên kết; trừ vì FAQ không có affordance mở/đóng |
| | **Tổng** | **21/40** | |

---

## 7. Ưu tiên P0 → P3

### P0 — Chặn phát hành (sai hiển thị, hỏng chức năng)

| # | Vấn đề | Nơi sửa (khi được phép) |
|---|---|---|
| P0-1 | `.page header` không khớp DOM → 2 link đầu trang landing hiện xanh gạch chân mặc định, mất border-bottom | `src/pages/page.css:8-25` + 4 file `test-*/index.html:26` |
| P0-2 | `.reveal { opacity:0 }` áp lên 7 thẻ + SEO + privacy → nội dung vô hình nếu JS lỗi **(Hallmark FAIL `62` xác nhận độc lập)** | `src/styles/main.css` (`.reveal`) |
| P0-3 | `#tool` (200px) nằm trên `<h1>` → khung rỗng trước tiêu đề, sai thứ tự đọc **(Hallmark FAIL `44b`: H1 rơi khỏi màn 1280×800 ở loa và micro)** | 4 file `test-*/index.html:31-33` |
| P0-4 | **Không có `:focus-visible` ở bất kỳ đâu** → người dùng bàn phím không biết focus đang ở đâu (Hallmark FAIL `26a`, 7 file) | `src/styles/main.css`, `src/pages/page.css`, 5 HTML |
| P0-5 | **`select.spk__device-select` chỉ 1.55:1** so với nền — viền control gần vô hình, dưới mức 3:1 của WCAG (Hallmark FAIL `40`) | `src/modules/speaker/*.css` |

### P1 — Người dùng mất thông tin hoặc bị dẫn sai

| # | Vấn đề |
|---|---|
| P1-1 | Copy thẻ "Phần mềm" nói tải **script PowerShell**, sản phẩm là **file `.bat`** |
| P1-2 | 4/7 thẻ không có heading (`<a>` thay `<h2>`) + 2 đích bấm cạnh tranh mỗi thẻ |
| P1-3 | Nav cắt "Test micro" ở 320–414, "Sửa máy tính Conic" ở 768, không dấu hiệu cuộn; <480px mất tên "Device Check" |
| P1-4 | 146–147 ký tự/dòng ở 1280+ (`p.bench__hint` 165) |
| P1-5 | Chữ chạm mép 8px ở 414 (trang chủ), 12px ở 320–414 (bàn phím) |
| P1-6 | Không nạp webfont → Segoe UI trên Windows, SF Pro trên macOS |
| P1-7 | `overflow-x: hidden` trên `body.is-locked` phá `position: sticky` của nav khi mở modal (Hallmark FAIL `34`) |
| P1-8 | 196–253 từ trên một màn ở 1440, cả 5 trang (Hallmark FAIL `58`) — xa ngưỡng đọc thoải mái |
| P1-9 | Màu `rgba(255,255,255,0.18)` viết thẳng ngoài `tokens.css` (Hallmark FAIL `48`) — phá quy ước "mọi màu từ token" |

### P2 — Bản sắc & trải nghiệm

| # | Vấn đề |
|---|---|
| P2-1 | Hero + hàng thẻ đồng nhất = "generic product page"; không có bằng chứng sản phẩm ở màn đầu |
| P2-2 | 7 thẻ không icon/ảnh/nhóm/số thứ tự; nút ghost không thẳng hàng giữa các thẻ |
| P2-3 | Logo trắng-xanh là họ màu thứ ba, sáng nhất trang |
| P2-4 | Modal: bảng 2 cột giãn 573–1167px; panel 1280px không có lý do |
| P2-5 | Thẻ lồng thẻ lồng panel (bench, software) |
| P2-6 | Software modal: lưới thẻ bị cắt ngang ở 92dvh, không dấu hiệu cuộn |
| P2-7 | Không có tiến trình/tải thực khi đo màn hình và stress test |
| P2-8 | "Dừng" ngang hàng "Nạp CPU & GPU" (4 nút ghost cùng cấp) |
| P2-9 | 3 vệt radial-gradient chỉ để nuôi hiệu ứng kính |
| P2-10 | FAQ mất tam giác, không thay bằng mũi tên |
| P2-11 | Bottom sheet không grabber, X ngoài vùng ngón tay |
| P2-12 | Nhịp dọc vừa thổi phồng vừa bóp: 0px giữa hai section trang chủ, 878px trống trên trang bàn phím, 712px trên trang loa (Hallmark REFLEX `59`, `79`) |
| P2-13 | Hero đặt lệch và kết thúc quá sớm: 96px trên / 72px dưới, hero hết ở 576/900px trang chủ, 106/900px ở 3 trang test (Hallmark REFLEX `44a`, `44c`) |
| P2-14 | Không có bậc chữ trung gian: heading section 32px dưới H1 64px (Hallmark REFLEX `78`) |
| P2-15 | Section "mỏng", không có khối lượng: trang bàn phím chỉ 1 section, trang chủ 3 section rộng 99–100% mà không có gì bên trong (Hallmark REFLEX `77`) |
| P2-16 | 7 thẻ chia 3+3+1 → một thẻ lẻ loi ở hàng cuối, không có gì lấp (Hallmark WARN `F20`) |

### P3 — Đánh bóng

| # | Vấn đề |
|---|---|
| P3-1 | `h1` lệch dòng 34%; `privacy h2` lệch 15% ở 375 — thiếu `text-wrap: balance` |
| P3-2 | 10 straggler — thiếu `text-wrap: pretty` hoặc nbsp ở 2 từ cuối |
| P3-3 | `--accent === --text` → không phân cấp được bằng màu |
| P3-4 | Mọi hành động là pill 980px |
| P3-5 | Nút đóng modal 44px nhưng tương phản thấp trên kính |
| P3-6 | Em dash trong hero sub |
| P3-7 | JSON-LD `SearchAction` mô tả tính năng tìm kiếm không tồn tại |
| P3-8 | Tên module trộn Việt/Anh ("Microphone", "CPU & GPU") |
| P3-9 | Nav không có `aria-current`; link ngoài không có dấu hiệu |
| P3-10 | `transition: width` trên `.bench__bar-fill` — animates layout (Hallmark FAIL `10a`) |
| P3-11 | Mặt tối `.card` / `.modal__panel` không đặt `color`, sống nhờ kế thừa (Hallmark WARN `41`) |
| P3-12 | Viền hairline dưới bóng mềm rộng trên `.modal__panel` (Hallmark WARN `F24`) |
| P3-13 | 4 độ đậm chữ (400/500/600/700) trong văn bản chạy ở trang bàn phím (Hallmark WARN `F19`) |
| P3-14 | Nav: "Test micro" / "Test camera" xuống 2 dòng ở 320–375 (Hallmark REFLEX `49b`) |
| P3-15 | Dấu nháy thẳng `"` trong văn xuôi: 10 chỗ trang loa, 4 bàn phím, 2 micro, 2 camera (Hallmark WARN `F1`) |
| P3-16 | Thiếu `text-wrap: balance` trên mọi heading hiển thị (Hallmark WARN `F3`) — gốc của P3-1 |

---

## 8. Persona — cờ đỏ

| Persona | Cờ đỏ |
|---|---|
| **Kỹ thuật viên sửa máy** (mở 7 công cụ/ngày, desktop 1440, Windows) | Bảng 2 cột giãn 1167px khiến đọc kết quả phải lia mắt; không có tải CPU/nhiệt độ thật trong stress test; không có phím tắt; modal phải mở/đóng từng cái. **Anh ta sẽ dùng Task Manager thay vì trang này.** |
| **Người dùng phổ thông gặp sự cố** (điện thoại 375, không biết "US ANSI" là gì) | Nav cắt mất "Test micro"; 7 thẻ giống nhau không biết bấm cái nào; link xanh mặc định ở đầu trang trông như trang lỗi; khung rỗng 200px trước tiêu đề. **Anh ta không tìm ra bài kiểm tra mình cần.** |
| **Người dùng lần đầu, chỉ muốn "xem nó làm được gì"** | Không có ảnh/waveform/preview nào ở màn đầu → không có gì chứng minh sản phẩm hoạt động. Phải bấm vào một thẻ rồi bấm tiếp một nút nữa mới thấy bất cứ điều gì. |
| **Người dùng macOS** | Được SF Pro (đúng ý đồ) — nhưng cũng là người ít cần test bàn phím PC nhất, và `getLayoutMap`/`setSinkId` có thể thiếu. |
| **Người dùng screen reader** | Outline trang chủ thiếu 4 heading (4 thẻ là `<a>`); `#tool` đứng trước `<h1>` nên vùng công cụ được đọc trước tiêu đề trang. |

---

## 9. Những gì đang tốt — đừng phá

- Tương phản **12–14:1** ở mọi nơi; `--text-soft` 7,6:1 và chỉ dùng ≥18px — kỷ luật tốt hơn phần lớn site.
- Bảng màu một tông có **lý lẽ ghi bằng chữ ngay trong `tokens.css`**, kèm số đo tương phản. Đây là tài liệu thiết kế thật.
- Đủ nhánh dự phòng: `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more`, `@supports not (backdrop-filter)`.
- Modal: focus trap, ESC, nút 44px, `aria-modal`.
- `#tool { min-height: 200px }` chống CLS — quyết định đúng (chỉ đặt sai chỗ, §3.2).
- `.bat` có xem trước, cảnh báo SmartScreen, báo lỗi từng app + gợi ý khắc phục.
- Không backend, không analytics, không cookie — và điều đó được nói rõ trên trang.

---

## 10. Phụ lục — tái lập

```powershell
# 1. Dev server
npm run dev                                  # http://localhost:5173

# 2. Chrome headless có CDP (impeccable detect <url> không chạy được trên máy này)
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @(
  '--headless=new','--remote-debugging-port=9401','--user-data-dir=<prof>',
  '--window-size=1440,900','http://localhost:5173/')

# 3. Quét
.\.opencode\skills\impeccable\scripts\bin\windows-x64\impeccable.exe `
  detect --cdp 9401 --target localhost:5173 --json

# 4. Danh mục 62 luật
.\.opencode\skills\impeccable\scripts\bin\windows-x64\impeccable.exe detect --list-rules

# 5. Hallmark — quét tĩnh toàn bộ HTML + CSS
node .agents/skills/hallmark/scripts/sloplint.mjs `
  index.html test-ban-phim/index.html test-loa/index.html `
  test-micro/index.html test-camera/index.html src --json

# 6. Hallmark — render 8 độ rộng (320/375/414/768/1024/1280/1440/1920)
node .agents/skills/hallmark/scripts/sloplint.mjs --render --json `
  --url http://localhost:5173/ `
  --url http://localhost:5173/test-ban-phim/ `
  --url http://localhost:5173/test-loa/ `
  --url http://localhost:5173/test-micro/ `
  --url http://localhost:5173/test-camera/
# ảnh chụp ra .hallmark/shots/
```

Ghi chú kỹ thuật khi tái lập:

- `impeccable detect <url>` **luôn hỏng** trên máy này (`Failed to create a temporary browser profile: Access is denied. (os error 5)`) — chỉ dùng `--cdp`.
- Luôn truyền `--target localhost:5173`: nếu Chrome có tab `about:blank`, detector từ chối quét ("2 pages are open…").
- Trước khi quét phải **cuộn hết trang xuống rồi lên**, nếu không `.reveal` giữ mọi thứ dưới màn đầu ở `opacity: 0` và kết quả đo sai.
- Mã thoát của `impeccable.exe` **không đáng tin** (trả 1 dù có phát hiện hợp lệ) — luôn đọc JSON.
- `scrollWidth === clientWidth` ở cả 8 viewport: **không có tràn ngang thật**. Đừng "sửa" lỗi này.
- `sloplint.mjs` cũng trả mã thoát 1 khi có phát hiện; đọc `summary` + `findings` trong JSON. Không có cờ `--viewport` — độ rộng do `sloplint-render.mjs` tự khai (`WIDTHS`).
- Toàn bộ lượt chạy Hallmark mất ~21 giây cho 5 URL; render không phụ thuộc dev server nếu quét file tĩnh (`--render` chỉ cần `--url` khi muốn đo trang đang chạy).

---

*Báo cáo này không kèm bất kỳ thay đổi mã nguồn nào. Mọi đường dẫn dòng trong báo cáo trỏ tới trạng thái hiện tại của `main`.*
