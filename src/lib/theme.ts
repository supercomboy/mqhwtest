export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "mq-theme";

/**
 * Đọc theme đã lưu từ localStorage.
 * Trả về "system" nếu chưa set hoặc localStorage không khả dụng.
 */
export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* localStorage có thể bị chặn (private mode, policy) */
  }
  return "system";
}

/**
 * Ghi theme vào localStorage. Bỏ qua nếu không ghi được.
 */
export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* bỏ qua */
  }
}

/**
 * Xác định theme "thực tế" đang áp dụng (đã resolve "system").
 */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }
  return theme;
}

/**
 * Áp theme lên <html> bằng cách thêm/xoá class .dark.
 */
export function applyThemeToDOM(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}