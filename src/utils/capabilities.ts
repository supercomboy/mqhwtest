import type { DeviceCapabilityMap } from "@/types/device";

/**
 * Phát hiện khả năng trình duyệt cho từng module test.
 * Chạy 1 lần khi app mount.
 */
export function detectCapabilities(): DeviceCapabilityMap {
  const hasMediaDevices =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  const hasAudioContext =
    typeof window !== "undefined" &&
    ("AudioContext" in window || "webkitAudioContext" in window);

  const hasFullscreen =
    typeof document !== "undefined" &&
    (typeof document.documentElement.requestFullscreen === "function" ||
      typeof (document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> })
        .webkitRequestFullscreen === "function");

  const hasAudio = typeof Audio !== "undefined";

  return {
    keyboard: {
      supported: true,
    },
    speaker: hasAudio
      ? { supported: true }
      : { supported: false, reason: "HTMLAudioElement is not available" },
    microphone: !hasMediaDevices
      ? {
          supported: false,
          reason: "MediaDevices API is not available in this browser",
        }
      : !hasAudioContext
        ? {
            supported: false,
            reason: "Web Audio API is not available in this browser",
          }
        : { supported: true },
    camera: hasMediaDevices
      ? { supported: true }
      : {
          supported: false,
          reason: "MediaDevices API is not available in this browser",
        },
    display: hasFullscreen
      ? { supported: true }
      : {
          supported: false,
          reason: "Fullscreen API is not available in this browser",
        },
  };
}

/**
 * Mô tả ngắn về môi trường trình duyệt — dùng cho SystemInfo.
 */
export interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  online: boolean;
  secureContext: boolean;
}

export function getBrowserInfo(): BrowserInfo {
  return {
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    platform:
      typeof navigator !== "undefined" && "platform" in navigator
        ? (navigator as Navigator & { platform: string }).platform
        : "unknown",
    language:
      typeof navigator !== "undefined" ? navigator.language : "unknown",
    online: typeof navigator !== "undefined" ? navigator.onLine : false,
    // getUserMedia yêu cầu HTTPS hoặc localhost
    secureContext:
      typeof window !== "undefined" ? window.isSecureContext : false,
  };
}