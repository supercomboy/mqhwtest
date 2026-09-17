import { useCallback, useEffect, useState } from "react";

import {
  applyThemeToDOM,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Hook quản lý theme: light | dark | system.
 * - Persist vào localStorage
 * - Đồng bộ giữa các tab qua "storage" event
 * - Theo dõi prefers-color-scheme khi ở chế độ "system"
 * - Áp class .dark lên <html>
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    resolveTheme(getStoredTheme()),
  );

  // Áp theme + đổi favicon theo theme
  useEffect(() => {
    applyThemeToDOM(theme);
    const r = resolveTheme(theme);
    setResolved(r);

    // Đổi favicon
    const favicon = document.getElementById("app-favicon");
    if (favicon instanceof HTMLLinkElement) {
      const base = import.meta.env.BASE_URL;
      favicon.href =
        r === "dark" ? `${base}logo1.png` : `${base}logo.png`;
    }
  }, [theme]);

  // Lắng nghe thay đổi từ tab khác
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "mq-theme") return;
      const next = getStoredTheme();
      setThemeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Lắng nghe thay đổi prefers-color-scheme (khi đang ở "system")
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyThemeToDOM("system");
      setResolved(resolveTheme("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
    setThemeState(next);
  }, []);

  /** Chu kỳ toggle: light → dark → system → light */
  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme =
        current === "light" ? "dark" : current === "dark" ? "system" : "light";
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, resolved, setTheme, cycleTheme };
}