// Dữ liệu bố cục bàn phím US ANSI. width/height tính theo đơn vị 1u (1u = một phím chữ).
// Mỗi phím dùng `code` (vị trí vật lý, event.code) làm định danh, không dùng ký tự hiển thị.
// Chế độ MacBook dùng chung dữ liệu này nhưng có bề rộng khác cho vài phím (widthMac),
// nhờ vậy bàn phím Mac thật hơn mà vẫn thẳng mép phải ở 14,5u thay vì 15u.

export type LayoutMode = 'pc' | 'mac';

export interface KeyDef {
  /** event.code — định danh vị trí vật lý. Rỗng với ô trống (spacer) hoặc phím trang trí. */
  code: string;
  /** Nhãn chính hiển thị trên phím. */
  label: string;
  /** Ký tự khi giữ Shift (chỉ để hiển thị). */
  shift?: string;
  /** Bề rộng theo 1u. Mặc định 1. */
  width?: number;
  /** Bề rộng thay thế ở chế độ MacBook (bàn phím Mac hẹp hơn 0,5u). */
  widthMac?: number;
  /** Chiều cao theo 1u. Mặc định 1. */
  height?: number;
  /** Vị trí cột (1-based) khi phím nằm trong lưới riêng (bàn phím số). */
  col?: number;
  /** Vị trí hàng (1-based) khi phím nằm trong lưới riêng (bàn phím số). */
  row?: number;
  /** Ô trống, không phải phím thật. */
  spacer?: boolean;
  /** Chỉ hiện ở một chế độ; bỏ trống nghĩa là hiện ở cả hai. */
  mode?: LayoutMode;
  /** Phím có thật trên máy nhưng trình duyệt không báo sự kiện (fn) — chỉ để nhìn. */
  decor?: boolean;
  /** Chú thích hiện khi rê chuột (dùng cho phím trang trí). */
  hint?: string;
  /** Nhãn dài (⌘ command) — dùng cỡ chữ nhỏ hơn để không bị cắt. */
  compactLabel?: boolean;
  /** Ô chứa nhiều phím xếp chồng (▲/▼ của MacBook). */
  stack?: KeyDef[];
}

const key = (code: string, label: string, extra: Partial<KeyDef> = {}): KeyDef => ({
  code,
  label,
  ...extra,
});

const spacer = (width: number, extra: Partial<KeyDef> = {}): KeyDef => ({
  code: '',
  label: '',
  width,
  spacer: true,
  ...extra,
});

/** Hàng Esc + F1–F12 (kèm khoảng trống chia cụm như bàn phím thật). */
export const functionRow: KeyDef[] = [
  key('Escape', 'esc'),
  // MacBook: khoảng trống đầu hàng hẹp lại 0,5u để cả hàng còn 14,5u.
  spacer(1, { widthMac: 0.5 }),
  ...['F1', 'F2', 'F3', 'F4'].map((f) => key(f, f)),
  spacer(0.5),
  ...['F5', 'F6', 'F7', 'F8'].map((f) => key(f, f)),
  spacer(0.5),
  ...['F9', 'F10', 'F11', 'F12'].map((f) => key(f, f)),
];

const rowNumber: KeyDef[] = [
  key('Backquote', '`', { shift: '~' }),
  key('Digit1', '1', { shift: '!' }),
  key('Digit2', '2', { shift: '@' }),
  key('Digit3', '3', { shift: '#' }),
  key('Digit4', '4', { shift: '$' }),
  key('Digit5', '5', { shift: '%' }),
  key('Digit6', '6', { shift: '^' }),
  key('Digit7', '7', { shift: '&' }),
  key('Digit8', '8', { shift: '*' }),
  key('Digit9', '9', { shift: '(' }),
  key('Digit0', '0', { shift: ')' }),
  key('Minus', '-', { shift: '_' }),
  key('Equal', '=', { shift: '+' }),
  key('Backspace', '⌫', { width: 2, widthMac: 1.5 }),
];

const rowTop: KeyDef[] = [
  key('Tab', 'tab', { width: 1.5 }),
  ...['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((c) => key(`Key${c}`, c)),
  key('BracketLeft', '[', { shift: '{' }),
  key('BracketRight', ']', { shift: '}' }),
  // MacBook: phím \ hẹp 1u, phần dôi ra dồn cho cụm phím chữ.
  key('Backslash', '\\', { shift: '|', width: 1.5, widthMac: 1 }),
];

const rowHome: KeyDef[] = [
  key('CapsLock', 'caps', { width: 1.75 }),
  ...['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((c) => key(`Key${c}`, c)),
  key('Semicolon', ';', { shift: ':' }),
  key('Quote', "'", { shift: '"' }),
  key('Enter', 'return', { width: 2.25, widthMac: 1.75 }),
];

const rowShift: KeyDef[] = [
  key('ShiftLeft', 'shift', { width: 2.25, widthMac: 2 }),
  ...['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((c) => key(`Key${c}`, c)),
  key('Comma', ',', { shift: '<' }),
  key('Period', '.', { shift: '>' }),
  key('Slash', '/', { shift: '?' }),
  key('ShiftRight', 'shift', { width: 2.75, widthMac: 2.5 }),
];

/** Hàng dưới của bàn phím PC: ctrl · win · alt · space · alt · win · menu · ctrl. */
const rowBottom: KeyDef[] = [
  key('ControlLeft', 'ctrl', { width: 1.25, mode: 'pc' }),
  key('MetaLeft', 'win', { width: 1.25, mode: 'pc' }),
  key('AltLeft', 'alt', { width: 1.25, mode: 'pc' }),
  key('Space', '', { width: 6.25, mode: 'pc' }),
  key('AltRight', 'alt', { width: 1.25, mode: 'pc' }),
  key('MetaRight', 'win', { width: 1.25, mode: 'pc' }),
  key('ContextMenu', 'menu', { width: 1.25, mode: 'pc' }),
  key('ControlRight', 'ctrl', { width: 1.25, mode: 'pc' }),
];

/**
 * Hàng dưới của bàn phím MacBook (14,5u): fn · control · option · ⌘ · space · ⌘ · option
 * và cụm mũi tên nằm ngay mép phải. Phím fn chỉ để nhìn vì trình duyệt không báo sự kiện cho fn.
 */
export const macRowBottom: KeyDef[] = [
  key('', 'fn', {
    width: 1,
    mode: 'mac',
    decor: true,
    hint: 'Phím fn không gửi sự kiện bàn phím cho trình duyệt nên không thể kiểm tra tự động — chỉ hiển thị cho giống máy thật.',
  }),
  key('ControlLeft', 'control', { width: 1, mode: 'mac' }),
  key('AltLeft', 'option', { width: 1, mode: 'mac' }),
  key('MetaLeft', '⌘ command', { width: 1.25, mode: 'mac', compactLabel: true }),
  key('Space', '', { width: 5, mode: 'mac' }),
  key('MetaRight', '⌘ command', { width: 1.25, mode: 'mac', compactLabel: true }),
  key('AltRight', 'option', { width: 1, mode: 'mac' }),
  key('ArrowLeft', '←', { width: 1, mode: 'mac' }),
  // Hai phím ▲/▼ xếp chồng trong cùng một ô 1u, đúng như cụm mũi tên của MacBook.
  {
    code: '',
    label: '',
    width: 1,
    mode: 'mac',
    stack: [key('ArrowUp', '↑'), key('ArrowDown', '↓')],
  },
  key('ArrowRight', '→', { width: 1, mode: 'mac' }),
];

/** Năm hàng phím chính của PC (mỗi hàng rộng đúng 15u). */
export const mainRows: KeyDef[][] = [rowNumber, rowTop, rowHome, rowShift, rowBottom];

/** Cụm điều hướng: 3 cột × 2 hàng. */
export const navCluster: KeyDef[][] = [
  [key('Insert', 'ins'), key('Home', 'home'), key('PageUp', 'pg up')],
  [key('Delete', 'del'), key('End', 'end'), key('PageDown', 'pg dn')],
];

/** Cụm mũi tên: hàng trên có ↑, hàng dưới có ← ↓ →. */
export const arrowRows: KeyDef[][] = [
  [spacer(1), key('ArrowUp', '↑'), spacer(1)],
  [key('ArrowLeft', '←'), key('ArrowDown', '↓'), key('ArrowRight', '→')],
];

/** Bàn phím số: lưới 4 cột × 5 hàng, có phím cao 2u (dấu + và Enter). */
export const numpadKeys: KeyDef[] = [
  key('NumLock', 'num', { col: 1, row: 1 }),
  key('NumpadDivide', '/', { col: 2, row: 1 }),
  key('NumpadMultiply', '*', { col: 3, row: 1 }),
  key('NumpadSubtract', '-', { col: 4, row: 1 }),
  key('Numpad7', '7', { col: 1, row: 2 }),
  key('Numpad8', '8', { col: 2, row: 2 }),
  key('Numpad9', '9', { col: 3, row: 2 }),
  key('NumpadAdd', '+', { col: 4, row: 2, height: 2 }),
  key('Numpad4', '4', { col: 1, row: 3 }),
  key('Numpad5', '5', { col: 2, row: 3 }),
  key('Numpad6', '6', { col: 3, row: 3 }),
  key('Numpad1', '1', { col: 1, row: 4 }),
  key('Numpad2', '2', { col: 2, row: 4 }),
  key('Numpad3', '3', { col: 3, row: 4 }),
  key('NumpadEnter', 'enter', { col: 4, row: 4, height: 2 }),
  key('Numpad0', '0', { col: 1, row: 5, width: 2 }),
  key('NumpadDecimal', '.', { col: 3, row: 5 }),
];
