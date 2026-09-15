import { useCallback, useEffect, useRef, useState } from "react";

export type MicStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "stopped"
  | "denied"
  | "no-device"
  | "unsupported"
  | "insecure"
  | "error";

export interface UseMicrophoneResult {
  status: MicStatus;
  error: string | null;
  level: number;
  peak: number;
  detected: boolean;
  deviceLabel: string | null;
  levelBarRef: React.RefObject<HTMLDivElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Ngưỡng RMS (0–1) coi như có input thật. */
const DETECT_THRESHOLD = 0.02;
/** Số frame liên tiếp vượt ngưỡng để set `detected = true`. */
const DETECT_FRAMES_NEEDED = 18;

export function useMicrophone(): UseMicrophoneResult {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [detected, setDetected] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);

  const levelBarRef = useRef<HTMLDivElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // ⚠️ FIX 1: khai báo generic <ArrayBuffer> tường minh
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const smoothedRef = useRef(0);
  const peakRef = useRef(0);
  const detectCountRef = useRef(0);
  const lastEmitRef = useRef(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const releaseResources = useCallback(async () => {
    stopLoop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        await audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
    }
    audioCtxRef.current = null;
    dataArrayRef.current = null;
    smoothedRef.current = 0;
    detectCountRef.current = 0;
    if (levelBarRef.current) levelBarRef.current.style.width = "0%";
  }, [stopLoop]);

  const startLoop = useCallback(() => {
    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (!analyser || !data) return;

      analyser.getByteTimeDomainData(data);

      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / data.length);

      const scaled = Math.min(100, Math.pow(rms * 3.5, 0.7) * 100);

      smoothedRef.current = smoothedRef.current * 0.65 + scaled * 0.35;
      const smoothed = smoothedRef.current;

      if (levelBarRef.current) {
        levelBarRef.current.style.width = `${smoothed.toFixed(2)}%`;
      }

      if (smoothed > peakRef.current) {
        peakRef.current = smoothed;
      }

      if (rms > DETECT_THRESHOLD) {
        detectCountRef.current = Math.min(
          DETECT_FRAMES_NEEDED,
          detectCountRef.current + 1,
        );
      } else {
        detectCountRef.current = Math.max(0, detectCountRef.current - 1);
      }
      if (detectCountRef.current >= DETECT_FRAMES_NEEDED) {
        setDetected((prev) => (prev ? prev : true));
      }

      const now = performance.now();
      if (now - lastEmitRef.current > 100) {
        lastEmitRef.current = now;
        setLevel(Math.round(smoothed));
        setPeak(Math.round(peakRef.current));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setDetected(false);
    setPeak(0);
    peakRef.current = 0;
    smoothedRef.current = 0;
    detectCountRef.current = 0;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setStatus("unsupported");
      setError("Your browser does not support microphone access.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("insecure");
      setError(
        "Microphone access requires a secure context (HTTPS or localhost).",
      );
      return;
    }

    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      setDeviceLabel(track?.label || null);

      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      audioCtxRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      source.connect(analyser);

      // ⚠️ FIX 2: tạo Uint8Array từ ArrayBuffer tường minh
      dataArrayRef.current = new Uint8Array(
        new ArrayBuffer(analyser.fftSize),
      );

      setStatus("listening");
      startLoop();
    } catch (err) {
      await releaseResources();

      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : String(err);

      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError(
          "Microphone permission was denied. Enable it in your browser settings and try again.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("no-device");
        setError("No microphone was found on this device.");
      } else if (name === "NotSupportedError") {
        setStatus("unsupported");
        setError("Microphone access is not supported in this browser.");
      } else {
        setStatus("error");
        setError(message || "An unexpected microphone error occurred.");
      }
    }
  }, [releaseResources, startLoop]);

  const stop = useCallback(() => {
    void releaseResources();
    setLevel(0);
    setStatus("stopped");
  }, [releaseResources]);

  const reset = useCallback(() => {
    void releaseResources();
    setLevel(0);
    setPeak(0);
    setDetected(false);
    setDeviceLabel(null);
    setError(null);
    setStatus("idle");
    peakRef.current = 0;
    smoothedRef.current = 0;
    detectCountRef.current = 0;
  }, [releaseResources]);

  useEffect(() => {
    return () => {
      void releaseResources();
    };
  }, [releaseResources]);

  return {
    status,
    error,
    level,
    peak,
    detected,
    deviceLabel,
    levelBarRef,
    start,
    stop,
    reset,
  };
}