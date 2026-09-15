import { useCallback, useEffect, useRef, useState } from "react";

export interface KeyEventRecord {
  timestamp: number;
  code: string;
  key: string;
  location: number;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  repeat: boolean;
}

export interface UseKeyboardResult {
  pressed: Set<string>;
  tested: Set<string>;
  lastEvent: KeyEventRecord | null;
  history: KeyEventRecord[];
  reset: () => void;
}

const HISTORY_LIMIT = 50;

/**
 * Danh sách code được phép "thoát" khỏi app:
 *   - F5 / F11 / F12 : reload, fullscreen, devtools (user có thể cần)
 *   - Escape         : đóng drawer / modal
 *   - Có Ctrl/Meta/Alt: browser shortcuts (Ctrl+R, Ctrl+W, Ctrl+T, ...)
 *
 * Mọi phím khác (Space, Tab, Arrow, Enter, Home, End, PgUp, PgDn, Backspace,
 * chữ, số, dấu) đều bị chặn để tránh scroll / đổi focus / trigger button.
 */
function isAllowedKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (/^F\d{1,2}$/.test(e.code)) return true;
  if (e.code === "Escape") return true;
  return false;
}

export function useKeyboard(): UseKeyboardResult {
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());
  const [tested, setTested] = useState<Set<string>>(() => new Set());
  const [lastEvent, setLastEvent] = useState<KeyEventRecord | null>(null);
  const [history, setHistory] = useState<KeyEventRecord[]>([]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      // Chỉ chặn khi không đang gõ trong input/textarea (dự phòng tương lai)
      if (!isEditable && !isAllowedKey(e)) {
        // capture phase + stopPropagation → chặn cả button nhận event
        e.preventDefault();
        e.stopPropagation();
      }

      setPressed((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });

      setTested((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });

      const record: KeyEventRecord = {
        timestamp: Date.now(),
        code: e.code,
        key: e.key,
        location: e.location,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
        repeat: e.repeat,
      };

      setLastEvent(record);

      if (!e.repeat) {
        setHistory((prev) => [record, ...prev].slice(0, HISTORY_LIMIT));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (!isEditable && !isAllowedKey(e)) {
        e.preventDefault();
        e.stopPropagation();
      }

      setPressed((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };

    // Mất focus → thả hết phím để tránh kẹt
    const onBlur = () => setPressed(new Set());

    // { capture: true } → chạy trước khi event bubble đến bất kỳ element nào
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const reset = useCallback(() => {
    setPressed(new Set());
    setTested(new Set());
    setLastEvent(null);
    setHistory([]);
  }, []);

  return { pressed, tested, lastEvent, history, reset };
}