// Phát hiện layout hệ thống có phải US không, và phát hiện bàn phím ISO/JIS.

interface KeyboardLayoutMapLike {
  get(code: string): string | undefined;
}

interface NavigatorKeyboardLike {
  getLayoutMap?: () => Promise<KeyboardLayoutMapLike>;
}

export interface LayoutEntry {
  code: string;
  expected: string;
  actual: string | null;
  ok: boolean;
}

export interface LayoutReport {
  /** Trình duyệt có navigator.keyboard.getLayoutMap hay không. */
  supported: boolean;
  /** true/false nếu kiểm tra được, null nếu không kiểm tra được. */
  isUs: boolean | null;
  entries: LayoutEntry[];
}

/** Các cặp code → ký tự đặc trưng để nhận diện layout US. */
const EXPECTED: Array<[string, string]> = [
  ['KeyQ', 'q'],
  ['KeyA', 'a'],
  ['KeyZ', 'z'],
  ['Backquote', '`'],
  ['Backslash', '\\'],
];

function getLayoutMap(): NavigatorKeyboardLike['getLayoutMap'] {
  const nav = navigator as Navigator & { keyboard?: NavigatorKeyboardLike };
  return nav.keyboard?.getLayoutMap;
}

/** Kiểm tra layout bằng Keyboard API (Chrome/Edge). */
export async function checkUsLayout(): Promise<LayoutReport> {
  const fn = getLayoutMap();
  if (typeof fn !== 'function') {
    return { supported: false, isUs: null, entries: [] };
  }
  try {
    const keyboard = (navigator as Navigator & { keyboard: NavigatorKeyboardLike }).keyboard;
    const map = await fn.call(keyboard);
    const entries = EXPECTED.map(([code, expected]) => {
      const actual = map.get(code) ?? null;
      return { code, expected, actual, ok: actual === expected };
    });
    return { supported: true, isUs: entries.every((e) => e.ok), entries };
  } catch {
    return { supported: false, isUs: null, entries: [] };
  }
}

/** Code chỉ xuất hiện trên bàn phím ISO/JIS. */
export const ISO_CODES = new Set(['IntlBackslash', 'IntlRo', 'IntlYen']);

/** Dòng mẫu để kiểm tra thủ công khi trình duyệt không có getLayoutMap. */
export const TYPING_SAMPLE = '~!@#$%^&*()_+{}|:"<>?';

export interface TypedMismatch {
  index: number;
  expected: string;
  got: string;
}

export interface TypedResult {
  mismatches: TypedMismatch[];
  complete: boolean;
  typed: number;
}

/** So khớp từng ký tự người dùng gõ với dòng mẫu. */
export function compareTyped(input: string): TypedResult {
  const mismatches: TypedMismatch[] = [];
  for (let i = 0; i < input.length && i < TYPING_SAMPLE.length; i++) {
    if (input[i] !== TYPING_SAMPLE[i]) {
      mismatches.push({ index: i, expected: TYPING_SAMPLE[i], got: input[i] });
    }
  }
  return {
    mismatches,
    complete: input.length >= TYPING_SAMPLE.length && mismatches.length === 0,
    typed: input.length,
  };
}
