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

  /** Có recording sẵn sàng để phát lại không. */
  hasRecording: boolean;
  /** Đang phát lại recording. */
  isPlayingBack: boolean;
  /** MediaRecorder có được hỗ trợ không. */
  supportsRecording: boolean;

  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  playRecording: () => Promise<void>;
  stopPlayback: () => void;
  clearRecording: () => void;
}

const DETECT_THRESHOLD = 0.02;
const DETECT_FRAMES_NEEDED = 18;

export function useMicrophone(): UseMicrophoneResult {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [detected, setDetected] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);

  const [hasRecording, setHasRecording] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [supportsRecording] = useState(
    () => typeof MediaRecorder !== "undefined",
  );

  const levelBarRef = useRef<HTMLDivElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Recording
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedUrlRef = useRef<string | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

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

  const stopPlayback = useCallback(() => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
      playbackAudioRef.current = null;
    }
    setIsPlayingBack(false);
  }, []);

  const releaseResources = useCallback(async () => {
    stopLoop();
    stopPlayback();

    // Dừng recorder nếu đang chạy (không cần đợi sự kiện)
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;

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
  }, [stopLoop, stopPlayback]);

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

    // Xoá recording cũ khi bắt đầu test mới
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    chunksRef.current = [];
    setHasRecording(false);
    stopPlayback();

    if (typeof window === "undefined" || !window.isSecureContext) {
      setStatus("insecure");
      setError(
        "Microphone access requires a secure context. Open this page at https:// or http://localhost — not via a LAN IP over HTTP.",
      );
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setStatus("unsupported");
      setError(
        "This browser does not expose the MediaDevices API. This can happen with strict privacy extensions, enterprise policies, or very old browsers.",
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

      dataArrayRef.current = new Uint8Array(
        new ArrayBuffer(analyser.fftSize),
      );

      // Khởi động MediaRecorder nếu browser hỗ trợ
      if (supportsRecording) {
        try {
          const recorder = new MediaRecorder(stream);
          chunksRef.current = [];
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              chunksRef.current.push(ev.data);
            }
          };
          recorder.onstop = () => {
            if (chunksRef.current.length === 0) return;
            const mime = recorder.mimeType || "audio/webm";
            const blob = new Blob(chunksRef.current, { type: mime });
            if (recordedUrlRef.current) {
              URL.revokeObjectURL(recordedUrlRef.current);
            }
            recordedUrlRef.current = URL.createObjectURL(blob);
            chunksRef.current = [];
            setHasRecording(true);
          };
          recorder.start();
          recorderRef.current = recorder;
        } catch {
          recorderRef.current = null;
        }
      }

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
  }, [releaseResources, startLoop, stopPlayback, supportsRecording]);

  const stop = useCallback(() => {
    // Dừng recorder trước để chunks cuối cùng được flush
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;

    void releaseResources();
    setLevel(0);
    setStatus("stopped");
  }, [releaseResources]);

  const reset = useCallback(() => {
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    chunksRef.current = [];
    setHasRecording(false);
    stopPlayback();

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
  }, [releaseResources, stopPlayback]);

  const playRecording = useCallback(async () => {
    const url = recordedUrlRef.current;
    if (!url) return;

    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }

    const audio = new Audio(url);
    playbackAudioRef.current = audio;
    audio.onended = () => setIsPlayingBack(false);
    audio.onerror = () => setIsPlayingBack(false);
    setIsPlayingBack(true);
    try {
      await audio.play();
    } catch {
      setIsPlayingBack(false);
      playbackAudioRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    stopPlayback();
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    chunksRef.current = [];
    setHasRecording(false);
  }, [stopPlayback]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
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
    hasRecording,
    isPlayingBack,
    supportsRecording,
    start,
    stop,
    reset,
    playRecording,
    stopPlayback,
    clearRecording,
  };
}