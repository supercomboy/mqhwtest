# MQ Device Tester — Design System

> Version 1.0 · Direction: **Diagnostic Instrument**

## 1. Brand

**MQ Device Tester** là công cụ chẩn đoán phần cứng máy tính chạy 100% trên trình duyệt.
Sản phẩm hướng tới kỹ thuật viên, nhân viên IT, và người dùng PC muốn kiểm tra nhanh linh kiện.

**Định vị:** dụng cụ đo chuyên nghiệp — không phải landing page, không phải blog, không phải SaaS.

## 2. Design Direction

**"Diagnostic Instrument"** — lấy cảm hứng từ mặt máy đo Fluke, oscilloscope, và System Information được làm tử tế.

Nguyên tắc:
1. Border làm việc, shadow chỉ để nâng tầng.
2. Nền trung tính lạnh; màu chỉ để truyền trạng thái hoặc CTA.
3. Typography là công cụ.
4. Mỗi pixel có lý do.
5. Trạng thái nhìn thấy được ngay cả khi không có màu.

## 3. Color Tokens

### Light

| Token | HSL | HEX |
|---|---|---|
| `--background` | `210 17% 98%` | `#F7F8FA` |
| `--foreground` | `222 47% 11%` | `#0F172A` |
| `--card` | `0 0% 100%` | `#FFFFFF` |
| `--card-foreground` | `222 47% 11%` | `#0F172A` |
| `--popover` | `0 0% 100%` | `#FFFFFF` |
| `--primary` | `221 83% 53%` | `#2563EB` |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` |
| `--secondary` | `210 40% 96%` | `#F1F5F9` |
| `--secondary-foreground` | `222 47% 11%` | `#0F172A` |
| `--muted` | `210 40% 96%` | `#F1F5F9` |
| `--muted-foreground` | `215 16% 47%` | `#64748B` |
| `--border` | `214 32% 91%` | `#E2E8F0` |
| `--input` | `214 32% 91%` | `#E2E8F0` |
| `--ring` | `221 83% 53%` | `#2563EB` |
| `--success` | `142 76% 36%` | `#16A34A` |
| `--warning` | `32 95% 44%` | `#D97706` |
| `--error` | `0 72% 51%` | `#DC2626` |
| `--info` | `200 98% 39%` | `#0284C7` |

### Dark

| Token | HSL | HEX |
|---|---|---|
| `--background` | `222 47% 5%` | `#070B14` |
| `--foreground` | `210 40% 96%` | `#F1F5F9` |
| `--card` | `222 40% 8%` | `#0C1322` |
| `--card-foreground` | `210 40% 96%` | `#F1F5F9` |
| `--popover` | `222 40% 10%` | `#0F1729` |
| `--primary` | `217 91% 60%` | `#3B82F6` |
| `--primary-foreground` | `222 47% 11%` | `#0F172A` |
| `--secondary` | `217 33% 15%` | `#1A2234` |
| `--secondary-foreground` | `210 40% 96%` | `#F1F5F9` |
| `--muted` | `217 33% 15%` | `#1A2234` |
| `--muted-foreground` | `215 20% 65%` | `#94A3B8` |
| `--border` | `217 33% 20%` | `#22304A` |
| `--input` | `217 33% 20%` | `#22304A` |
| `--ring` | `217 91% 60%` | `#3B82F6` |
| `--success` | `142 71% 45%` | `#22C55E` |
| `--warning` | `38 92% 50%` | `#F59E0B` |
| `--error` | `0 84% 60%` | `#EF4444` |
| `--info` | `199 89% 48%` | `#0EA5E9` |

## 4. Typography

- **UI / Body:** Inter
- **Technical / Mono:** JetBrains Mono

| Vai trò | Size | LH | Weight | Tracking | Font |
|---|---|---|---|---|---|
| Display | 36px | 40px | 700 | -0.02em | Inter |
| H1 | 30px | 36px | 700 | -0.02em | Inter |
| H2 | 24px | 32px | 600 | -0.01em | Inter |
| H3 | 20px | 28px | 600 | -0.01em | Inter |
| Body Large | 16px | 24px | 400 | 0 | Inter |
| Body | 14px | 20px | 400 | 0 | Inter |
| Small | 13px | 18px | 400 | 0 | Inter |
| Caption | 12px | 16px | 500 | 0.02em | Inter |
| Code | 13px | 20px | 500 | 0 | JetBrains Mono |

## 5. Spacing

Base unit: **4px**. Chỉ dùng: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

## 6. Radius

| Token | Value |
|---|---|
| `sm` | 4px |
| `md` | 6px (mặc định) |
| `lg` | 8px |
| `full` | 9999px (chỉ badge pill) |

## 7. Shadows

| Token | Value |
|---|---|
| `xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `sm` | `0 1px 3px 0 rgb(0 0 0 / 0.08)` |
| `md` | `0 4px 12px 0 rgb(0 0 0 / 0.08)` |
| `lg` | `0 12px 32px 0 rgb(0 0 0 / 0.12)` |

Quy tắc: nếu border đủ, không dùng shadow.

## 8. Icons

- Thư viện: **Lucide React**
- Size: `14 · 16 · 20 · 24` (không dùng lẻ)
- Stroke width: `1.75` mặc định, `2` cho trạng thái active
- Không emoji, không SVG tự vẽ

## 9. Buttons

| Variant | Background | Foreground | Border |
|---|---|---|---|
| primary | `--primary` | `--primary-foreground` | none |
| secondary | `--secondary` | `--secondary-foreground` | `--border` |
| outline | transparent | `--foreground` | `--border` |
| ghost | transparent | `--foreground` | none |
| destructive | `--error` | white | none |

Size: `sm h-8 · md h-9 · lg h-10`

## 10. Cards

- Border `1px --border`, radius `md`, padding `space-6`
- Không shadow mặc định
- Hover nếu clickable: border → `--primary/40`

## 11. Status

| Status | Icon | Color | Text |
|---|---|---|---|
| Ready | Circle | muted-fg | READY |
| Testing | Loader2 | info | TESTING |
| Passed | CheckCircle2 | success | PASSED |
| Warning | AlertTriangle | warning | WARNING |
| Error | XCircle | error | ERROR |
| Permission Required | ShieldAlert | warning | PERMISSION REQUIRED |
| Not Available | MinusCircle | muted-fg | NOT AVAILABLE |

**Luôn icon + text + color.** Không bao giờ chỉ color.

## 12. Forms

- Input h-9, radius `md`, border `--input`, focus ring `--ring` 2px
- Label: Caption uppercase tracking rộng
- Error message: Small, color `--error`, có icon `AlertCircle`

## 13. Navigation

- Desktop ≥1280px: sidebar trái 240px + topbar 56px
- <1280px: topbar + drawer
- Item active: bg `--muted`, border-left 2px `--primary`

## 14. Responsive

Ưu tiên test ở: `1920×1080 · 1440×900 · 1366×768 · 1280×720`.
Không tạo horizontal scroll ở bất kỳ breakpoint nào ≥1280px.

## 15. Accessibility

- Contrast tối thiểu AA (4.5:1 cho body, 3:1 cho large text)
- Focus ring luôn hiển thị
- `aria-live="polite"` cho mọi status thay đổi
- `prefers-reduced-motion` được tôn trọng
- Không dùng màu làm tín hiệu duy nhất
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, không `<div onclick>`

## 16. Dark Mode

- Token-first: mọi màu là CSS var
- Lưu bằng `localStorage` key `mq-theme` (`light | dark | system`)
- Default: `system`
- Chống FOUC bằng inline script trong `index.html`