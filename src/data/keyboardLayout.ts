/**
 * Định nghĩa layout bàn phím full-size (chuẩn ANSI).
 *
 * Toạ độ cho main area: mỗi row là một grid 60 cells (0.25u/cell).
 *   width 1u   → span 4
 *   width 1.5u → span 6
 *   width 2u   → span 8
 *   width 2.25u→ span 9
 *   width 2.75u→ span 11
 *   width 6.25u→ span 25
 *
 * Function row dùng grid riêng 16 columns đều nhau.
 *
 * Nav cluster và Numpad dùng grid có toạ độ tuyệt đối (gridRow, gridCol).
 */

export interface KeyDef {
  /** Khớp với `KeyboardEvent.code` */
  code: string;
  /** Nhãn chính hiển thị trên key */
  label: string;
  /** Nhãn phụ (shift legend) — hiển thị nhỏ phía trên */
  sublabel?: string;
  /** Độ rộng theo đơn vị u. Chỉ dùng cho main area */
  width?: number;
  /** Toạ độ tuyệt đối — chỉ dùng cho nav / numpad */
  gridRow?: number;
  gridCol?: number;
  rowSpan?: number;
  colSpan?: number;
}

export interface KeyRow {
  id: string;
  label: string;
  keys: KeyDef[];
}

/* ============================================================
 * MAIN AREA — 6 rows
 * ============================================================ */

export const FUNCTION_ROW: KeyRow = {
  id: "function",
  label: "Function row",
  keys: [
    { code: "Escape", label: "Esc", width: 1 },
    { code: "F1", label: "F1", width: 1 },
    { code: "F2", label: "F2", width: 1 },
    { code: "F3", label: "F3", width: 1 },
    { code: "F4", label: "F4", width: 1 },
    { code: "F5", label: "F5", width: 1 },
    { code: "F6", label: "F6", width: 1 },
    { code: "F7", label: "F7", width: 1 },
    { code: "F8", label: "F8", width: 1 },
    { code: "F9", label: "F9", width: 1 },
    { code: "F10", label: "F10", width: 1 },
    { code: "F11", label: "F11", width: 1 },
    { code: "F12", label: "F12", width: 1 },
    { code: "PrintScreen", label: "PrtSc", width: 1 },
    { code: "ScrollLock", label: "ScrLk", width: 1 },
    { code: "Pause", label: "Pause", width: 1 },
  ],
};

export const MAIN_ROWS: KeyRow[] = [
  {
    id: "number",
    label: "Number row",
    keys: [
      { code: "Backquote", label: "`", sublabel: "~", width: 1 },
      { code: "Digit1", label: "1", sublabel: "!", width: 1 },
      { code: "Digit2", label: "2", sublabel: "@", width: 1 },
      { code: "Digit3", label: "3", sublabel: "#", width: 1 },
      { code: "Digit4", label: "4", sublabel: "$", width: 1 },
      { code: "Digit5", label: "5", sublabel: "%", width: 1 },
      { code: "Digit6", label: "6", sublabel: "^", width: 1 },
      { code: "Digit7", label: "7", sublabel: "&", width: 1 },
      { code: "Digit8", label: "8", sublabel: "*", width: 1 },
      { code: "Digit9", label: "9", sublabel: "(", width: 1 },
      { code: "Digit0", label: "0", sublabel: ")", width: 1 },
      { code: "Minus", label: "-", sublabel: "_", width: 1 },
      { code: "Equal", label: "=", sublabel: "+", width: 1 },
      { code: "Backspace", label: "Backspace", width: 2 },
    ],
  },
  {
    id: "qwerty",
    label: "QWERTY row",
    keys: [
      { code: "Tab", label: "Tab", width: 1.5 },
      { code: "KeyQ", label: "Q", width: 1 },
      { code: "KeyW", label: "W", width: 1 },
      { code: "KeyE", label: "E", width: 1 },
      { code: "KeyR", label: "R", width: 1 },
      { code: "KeyT", label: "T", width: 1 },
      { code: "KeyY", label: "Y", width: 1 },
      { code: "KeyU", label: "U", width: 1 },
      { code: "KeyI", label: "I", width: 1 },
      { code: "KeyO", label: "O", width: 1 },
      { code: "KeyP", label: "P", width: 1 },
      { code: "BracketLeft", label: "[", sublabel: "{", width: 1 },
      { code: "BracketRight", label: "]", sublabel: "}", width: 1 },
      { code: "Backslash", label: "\\", sublabel: "|", width: 1.5 },
    ],
  },
  {
    id: "home",
    label: "Home row",
    keys: [
      { code: "CapsLock", label: "Caps Lock", width: 1.75 },
      { code: "KeyA", label: "A", width: 1 },
      { code: "KeyS", label: "S", width: 1 },
      { code: "KeyD", label: "D", width: 1 },
      { code: "KeyF", label: "F", width: 1 },
      { code: "KeyG", label: "G", width: 1 },
      { code: "KeyH", label: "H", width: 1 },
      { code: "KeyJ", label: "J", width: 1 },
      { code: "KeyK", label: "K", width: 1 },
      { code: "KeyL", label: "L", width: 1 },
      { code: "Semicolon", label: ";", sublabel: ":", width: 1 },
      { code: "Quote", label: "'", sublabel: '"', width: 1 },
      { code: "Enter", label: "Enter", width: 2.25 },
    ],
  },
  {
    id: "shift",
    label: "Shift row",
    keys: [
      { code: "ShiftLeft", label: "Shift", width: 2.25 },
      { code: "KeyZ", label: "Z", width: 1 },
      { code: "KeyX", label: "X", width: 1 },
      { code: "KeyC", label: "C", width: 1 },
      { code: "KeyV", label: "V", width: 1 },
      { code: "KeyB", label: "B", width: 1 },
      { code: "KeyN", label: "N", width: 1 },
      { code: "KeyM", label: "M", width: 1 },
      { code: "Comma", label: ",", sublabel: "<", width: 1 },
      { code: "Period", label: ".", sublabel: ">", width: 1 },
      { code: "Slash", label: "/", sublabel: "?", width: 1 },
      { code: "ShiftRight", label: "Shift", width: 2.75 },
    ],
  },
  {
    id: "bottom",
    label: "Bottom row",
    keys: [
      { code: "ControlLeft", label: "Ctrl", width: 1.25 },
      { code: "MetaLeft", label: "Win", width: 1.25 },
      { code: "AltLeft", label: "Alt", width: 1.25 },
      { code: "Space", label: "Space", width: 6.25 },
      { code: "AltRight", label: "Alt", width: 1.25 },
      { code: "MetaRight", label: "Win", width: 1.25 },
      { code: "ContextMenu", label: "Menu", width: 1.25 },
      { code: "ControlRight", label: "Ctrl", width: 1.25 },
    ],
  },
];

/* ============================================================
 * NAVIGATION CLUSTER — grid 3 cột × 5 hàng
 * ============================================================ */

export const NAV_CLUSTER: KeyDef[] = [
  { code: "Insert", label: "Ins", gridRow: 1, gridCol: 1 },
  { code: "Home", label: "Home", gridRow: 1, gridCol: 2 },
  { code: "PageUp", label: "PgUp", gridRow: 1, gridCol: 3 },

  { code: "Delete", label: "Del", gridRow: 2, gridCol: 1 },
  { code: "End", label: "End", gridRow: 2, gridCol: 2 },
  { code: "PageDown", label: "PgDn", gridRow: 2, gridCol: 3 },

  { code: "ArrowUp", label: "↑", gridRow: 4, gridCol: 2 },

  { code: "ArrowLeft", label: "←", gridRow: 5, gridCol: 1 },
  { code: "ArrowDown", label: "↓", gridRow: 5, gridCol: 2 },
  { code: "ArrowRight", label: "→", gridRow: 5, gridCol: 3 },
];

/* ============================================================
 * NUMPAD — grid 4 cột × 5 hàng
 * ============================================================ */

export const NUMPAD: KeyDef[] = [
  { code: "NumLock", label: "Num", gridRow: 1, gridCol: 1 },
  { code: "NumpadDivide", label: "/", gridRow: 1, gridCol: 2 },
  { code: "NumpadMultiply", label: "*", gridRow: 1, gridCol: 3 },
  { code: "NumpadSubtract", label: "−", gridRow: 1, gridCol: 4 },

  { code: "Numpad7", label: "7", gridRow: 2, gridCol: 1 },
  { code: "Numpad8", label: "8", gridRow: 2, gridCol: 2 },
  { code: "Numpad9", label: "9", gridRow: 2, gridCol: 3 },
  {
    code: "NumpadAdd",
    label: "+",
    gridRow: 2,
    gridCol: 4,
    rowSpan: 2,
  },

  { code: "Numpad4", label: "4", gridRow: 3, gridCol: 1 },
  { code: "Numpad5", label: "5", gridRow: 3, gridCol: 2 },
  { code: "Numpad6", label: "6", gridRow: 3, gridCol: 3 },

  { code: "Numpad1", label: "1", gridRow: 4, gridCol: 1 },
  { code: "Numpad2", label: "2", gridRow: 4, gridCol: 2 },
  { code: "Numpad3", label: "3", gridRow: 4, gridCol: 3 },
  {
    code: "NumpadEnter",
    label: "Enter",
    gridRow: 4,
    gridCol: 4,
    rowSpan: 2,
  },

  {
    code: "Numpad0",
    label: "0",
    gridRow: 5,
    gridCol: 1,
    colSpan: 2,
  },
  { code: "NumpadDecimal", label: ".", gridRow: 5, gridCol: 3 },
];

/* ============================================================
 * Utility
 * ============================================================ */

/**
 * Tra cứu KeyDef theo code. Dùng để tra label khi có keydown.
 */
const ALL_KEYS: KeyDef[] = [
  ...FUNCTION_ROW.keys,
  ...MAIN_ROWS.flatMap((r) => r.keys),
  ...NAV_CLUSTER,
  ...NUMPAD,
];

const CODE_TO_KEY: Map<string, KeyDef> = new Map(
  ALL_KEYS.map((k) => [k.code, k]),
);

export function getKeyByCode(code: string): KeyDef | undefined {
  return CODE_TO_KEY.get(code);
}

/** Tổng số phím trong layout — dùng cho progress. */
export const TOTAL_KEY_COUNT = ALL_KEYS.length;