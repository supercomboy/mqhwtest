import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "streaming"
  | "stopped"
  | "denied"
  | "no-device"
  | "unsupported"
  | "insecure"
  | "in-use"
  | "error";

export interface VideoDimensions {
  width: number;
  height: number;
}

export interface UseCameraResult {
  status: CameraStatus;
  error: string | null;
  /** Nhãn thiết bị (nếu browser cung cấp). */
  deviceLabel: string | null;
  /** Độ phân giải thực tế của video. */
  dimensions: VideoDimensions | null;
  /** Đang bật chế độ gương. */
  mirror: boolean;
  /** True khi video đã phát được ít nhất 1 frame trong session hiện tại. */
  hasStreamedOnce: boolean;
  /** Callback ref — gán vào `<video ref={videoRef} />`. */
  videoRef: (el: HTMLVideoElement | null) => void;
  setMirror: (v: boolean) => void;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  /** Chụp frame hiện tại thành PNG data URL. Trả về null nếu chưa sẵn sàng. */
  captureScreenshot: () => string | null;
}

export function useCamera(): UseCameraResult {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<VideoDimensions | null>(null);
  const [mirror, setMirror] = useState(true);
  const [hasStreamedOnce, setHasStreamedOnce] = useState(false);

  // Video element state — dùng callback ref để React biết khi element mount
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    setVideoEl(el);
  }, []);

  /* ---------------------------------------------------------------
   * Attach / detach stream vào video element
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!videoEl) return;

    if (stream) {
      videoEl.srcObject = stream;
      // Một số browser cần gọi play() thủ công sau khi set srcObject
      const p = videoEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* autoplay bị chặn — bình thường nếu user chưa tương tác */
        });
      }
    } else {
      videoEl.srcObject = null;
    }
  }, [videoEl, stream]);

  /* ---------------------------------------------------------------
   * Lắng nghe loadedmetadata để lấy dimensions
   * -------------------------------------------------------------- */
  useEffect(() => {
    if (!videoEl) return;
    const onLoaded = () => {
      setDimensions({
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
      });
      setHasStreamedOnce(true);
    };
    videoEl.addEventListener("loadedmetadata", onLoaded);
    return () => {
      videoEl.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [videoEl]);

  /* ---------------------------------------------------------------
   * Release resources
   * -------------------------------------------------------------- */
  const releaseResources = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setStream(null);
    setDimensions(null);
  }, [videoEl]);

  /* ---------------------------------------------------------------
   * Start
   * -------------------------------------------------------------- */
  const start = useCallback(async () => {
    setError(null);
    setHasStreamedOnce(false);

    // Support check
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setStatus("unsupported");
      setError("Your browser does not support camera access.");
      return;
    }

    // Secure context check
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("insecure");
      setError(
        "Camera access requires a secure context (HTTPS or localhost).",
      );
      return;
    }

    setStatus("requesting");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Nếu component đã unmount trong khi chờ — dừng ngay
      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      setDeviceLabel(track?.label || null);

      setStatus("streaming");
    } catch (err) {
      releaseResources();

      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : String(err);

      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError(
          "Camera permission was denied. Enable it in your browser settings and try again.",
        );
      } else if (
        name === "NotFoundError" ||
        name === "OverconstrainedError"
      ) {
        setStatus("no-device");
        setError("No camera was found on this device.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setStatus("in-use");
        setError(
          "Camera is already in use by another application. Close any app using the camera (Zoom, Teams, browser tabs, etc.) and try again.",
        );
      } else if (name === "NotSupportedError") {
        setStatus("unsupported");
        setError("Camera access is not supported in this browser.");
      } else {
        setStatus("error");
        setError(message || "An unexpected camera error occurred.");
      }
    }
  }, [releaseResources]);

  /* ---------------------------------------------------------------
   * Stop
   * -------------------------------------------------------------- */
  const stop = useCallback(() => {
    releaseResources();
    setStatus("stopped");
  }, [releaseResources]);

  /* ---------------------------------------------------------------
   * Reset
   * -------------------------------------------------------------- */
  const reset = useCallback(() => {
    releaseResources();
    setStatus("idle");
    setError(null);
    setDeviceLabel(null);
    setHasStreamedOnce(false);
    setMirror(true);
  }, [releaseResources]);

  /* ---------------------------------------------------------------
   * Screenshot
   * -------------------------------------------------------------- */
  const captureScreenshot = useCallback((): string | null => {
    const video = videoEl;
    if (!video || video.readyState < 2) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  }, [videoEl, mirror]);

  /* ---------------------------------------------------------------
   * Mount/unmount lifecycle
   * -------------------------------------------------------------- */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    deviceLabel,
    dimensions,
    mirror,
    hasStreamedOnce,
    videoRef,
    setMirror,
    start,
    stop,
    reset,
    captureScreenshot,
  };
}