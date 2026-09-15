/**
 * Helper cho keyboard test.
 */

/** Các code là modifier — hiển thị nhãn khác. */
export const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
  "NumLock",
  "ScrollLock",
]);

/** Các code bị browser/OS bắt — không thể bắt trong app. */
export const BROWSER_RESERVED = new Set([
  "F5", // reload
  "F11", // fullscreen
  "F12", // devtools
  "Tab", // focus chuyển (chỉ chặn được khi page có focus đúng)
]);

/**
 * Nhãn cho `KeyboardEvent.location`.
 */
export function getLocationLabel(location: number): string {
  switch (location) {
    case 0:
      return "Standard";
    case 1:
      return "Left";
    case 2:
      return "Right";
    case 3:
      return "Numpad";
    default:
      return "Unknown";
  }
}

/**
 * Shape tối thiểu để trích modifiers.
 * Dùng cho cả native KeyboardEvent (đã convert) và KeyEventRecord của ta.
 */
interface ModifierSource {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Chuỗi biểu diễn modifiers đang giữ.
 * Ví dụ: ["Ctrl", "Shift"]
 */
export function getModifierList(e: ModifierSource): string[] {
  const list: string[] = [];
  if (e.ctrl) list.push("Ctrl");
  if (e.shift) list.push("Shift");
  if (e.alt) list.push("Alt");
  if (e.meta) list.push("Meta");
  return list;
}

/**
 * Nhận native KeyboardEvent và trả về shape ModifierSource.
 * Dùng khi cần gọi getModifierList từ native event.
 */
export function modifiersFromEvent(e: {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): ModifierSource {
  return {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };
}

/**
 * Format `key` cho dễ đọc. Space hiển thị thành "Space" thay vì " ".
 */
export function formatKeyName(key: string): string {
  if (key === " ") return "Space";
  if (key === "Enter") return "Enter";
  if (key === "Tab") return "Tab";
  if (key === "Escape") return "Escape";
  if (key === "Backspace") return "Backspace";
  if (key === "Delete") return "Delete";
  if (key.length === 1) return key.toUpperCase();
  return key;
}