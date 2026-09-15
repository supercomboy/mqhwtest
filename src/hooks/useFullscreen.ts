import { useCallback, useEffect, useState } from "react";

interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export interface UseFullscreenResult {
  isFullscreen: boolean;
  isSupported: boolean;
  request: () => void;
  exit: () => void;
  toggle: () => void;
}

export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(
    () =>
      typeof document !== "undefined" &&
      (document.fullscreenElement !== null ||
        (document as WebkitDocument).webkitFullscreenElement !== null),
  );

  const [isSupported] = useState(() => {
    if (typeof document === "undefined") return false;
    const el = document.documentElement as WebkitElement;
    return (
      typeof el.requestFullscreen === "function" ||
      typeof el.webkitRequestFullscreen === "function"
    );
  });

  useEffect(() => {
    const onChange = () => {
      const doc = document as WebkitDocument;
      const active =
        document.fullscreenElement !== null ||
        doc.webkitFullscreenElement !== null;
      setIsFullscreen(active);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const request = useCallback(() => {
    const el = document.documentElement as WebkitElement;
    try {
      if (typeof el.requestFullscreen === "function") {
        void el.requestFullscreen();
      } else if (typeof el.webkitRequestFullscreen === "function") {
        void el.webkitRequestFullscreen();
      }
    } catch {
      /* Fullscreen có thể bị chặn — overlay vẫn che màn hình */
    }
  }, []);

  const exit = useCallback(() => {
    const doc = document as WebkitDocument;
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === "function") {
        void doc.webkitExitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) exit();
    else request();
  }, [isFullscreen, request, exit]);

  return { isFullscreen, isSupported, request, exit, toggle };
}