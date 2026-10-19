// Dữ liệu bố cục bàn phím US ANSI. width/height tính theo đơn vị 1u (1u = một phím chữ).
// Mỗi phím dùng `code` (vị trí vật lý, event.code) làm định danh, không dùng ký tự hiển thị.

export interface KeyDef {
  /** event.code — định danh vị trí vật lý. Rỗng với ô trống (spacer). */
  code: string;
  /** Nhãn chính hiển thị trên phím. */
  label: string;
  /** Ký tự khi giữ Shift (chỉ để hiển thị). */
  shift?: string;
  /** Bề rộng theo 1u. Mặc định 1. */
  width?: number;
  /** Chiều cao theo 1u. Mặc định 1. */
  height?: number;
  /** Vị trí cột (1-based) khi phím nằm trong lưới riêng (bàn phím số). */
  col?: number;
  /** Vị trí hàng (1-based) khi phím nằm trong lưới riêng (bàn phím số). */
  row?: number;
  /** Ô trống, không phải phím thật. */
  spacer?: boolean;
}

const key = (code: string, label: string, extra: Partial<KeyDef> = {}): KeyDef => ({
  code,
  label,
  ...extra,
});

const spacer = (width: number): KeyDef => ({ code: '', label: '', width, spacer: true });

/** Hàng Esc + F1–F12 (kèm khoảng trống chia cụm như bàn phím thật). */
export const functionRow: KeyDef[] = [
  key('Escape', 'esc'),
  spacer(1),
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
  key('Backspace', '⌫', { width: 2 }),
];

const rowTop: KeyDef[] = [
  key('Tab', 'tab', { width: 1.5 }),
  ...['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((c) => key(`Key${c}`, c)),
  key('BracketLeft', '[', { shift: '{' }),
  key('BracketRight', ']', { shift: '}' }),
  key('Backslash', '\\', { shift: '|', width: 1.5 }),
];

const rowHome: KeyDef[] = [
  key('CapsLock', 'caps', { width: 1.75 }),
  ...['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((c) => key(`Key${c}`, c)),
  key('Semicolon', ';', { shift: ':' }),
  key('Quote', "'", { shift: '"' }),
  key('Enter', 'return', { width: 2.25 }),
];

const rowShift: KeyDef[] = [
  key('ShiftLeft', 'shift', { width: 2.25 }),
  ...['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((c) => key(`Key${c}`, c)),
  key('Comma', ',', { shift: '<' }),
  key('Period', '.', { shift: '>' }),
  key('Slash', '/', { shift: '?' }),
  key('ShiftRight', 'shift', { width: 2.75 }),
];

const rowBottom: KeyDef[] = [
  key('ControlLeft', 'ctrl', { width: 1.25 }),
  key('MetaLeft', 'win', { width: 1.25 }),
  key('AltLeft', 'alt', { width: 1.25 }),
  key('Space', '', { width: 6.25 }),
  key('AltRight', 'alt', { width: 1.25 }),
  key('MetaRight', 'win', { width: 1.25 }),
  key('ContextMenu', 'menu', { width: 1.25 }),
  key('ControlRight', 'ctrl', { width: 1.25 }),
];

/** Năm hàng phím chính (mỗi hàng rộng đúng 15u). */
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
