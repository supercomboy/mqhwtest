import { useEffect } from "react";

const BASE_TITLE = "MQ Device Tester";

/**
 * Đổi document.title theo route. Screen reader đọc title mới khi user
 * navigate giữa các trang. Phải reset khi unmount.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}