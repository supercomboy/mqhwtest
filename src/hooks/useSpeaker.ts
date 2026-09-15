import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakerSourceType = "mp3" | "tone";

export type SpeakerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export interface UseSpeakerResult {
  status: SpeakerStatus;
  sourceType: SpeakerSourceType;
  /** Tổng thời lượng (giây). 0 nếu chưa load xong. */
  duration: number;
  /** Vị trí hiện tại (giây). */
  currentTime: number;
  /** Volume 0–100 (UI dùng số nguyên). */
  volume: number;
  /** Thông báo lỗi nếu status = "error". */
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  seek: (t: number) => void;
}

const MP3_PATH = `${import.meta.env.BASE_URL}audio/speaker-test.mp3`;

/**
 * Sinh WAV Blob chứa sine wave có fade in/out để tránh click.
 * Trả về object URL — cần revoke khi không dùng nữa.
 */
function createTestToneUrl(
  freq = 440,
  durationSec = 3,
  sampleRate = 44100,
): string {
  const samples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV header
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, samples * 2, true);

  // Samples với fade in/out 5% đầu/cuối
  const fadeSamples = Math.floor(sampleRate * 0.05);
  const baseAmp = 0.3;
  for (let i = 0; i < samples; i++) {
    let amp = baseAmp;
    if (i < fadeSamples) amp *= i / fadeSamples;
    else if (i > samples - fadeSamples) amp *= (samples - i) / fadeSamples;
    const v = Math.sin((2 * Math.PI * freq * i) / sampleRate) * amp;
    view.setInt16(44 + i * 2, v * 0x7fff, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function useSpeaker(): UseSpeakerResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toneUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<SpeakerStatus>("loading");
  const [sourceType, setSourceType] = useState<SpeakerSourceType>("mp3");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(70);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------
   * Mount: tạo audio element, gán src MP3, đăng ký listeners
   * -------------------------------------------------------------- */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume / 100;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setStatus("idle");
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setStatus("playing");
    const handlePause = () => {
      // Chỉ chuyển sang paused nếu không phải do ended
      if (!audio.ended) setStatus("paused");
    };
    const handleEnded = () => {
      setStatus("ended");
      setCurrentTime(audio.duration || 0);
    };

    /**
     * Fallback: nếu MP3 không load được, sinh tone và dùng luôn.
     * Bất kỳ lỗi nào cũng trigger — kể cả không tồn tại file (404).
     */
    const handleError = () => {
      if (sourceType === "tone") {
        setError(
          "Could not load audio file and tone generation failed. Please check your browser settings.",
        );
        setStatus("error");
        return;
      }

      // Lần đầu lỗi: chuyển sang tone
      try {
        const url = createTestToneUrl();
        toneUrlRef.current = url;
        setSourceType("tone");
        audio.src = url;
        audio.load();
      } catch {
        setError("Failed to generate test tone.");
        setStatus("error");
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audio.src = MP3_PATH;
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.src = "";
      if (toneUrlRef.current) {
        URL.revokeObjectURL(toneUrlRef.current);
        toneUrlRef.current = null;
      }
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------
   * Actions
   * -------------------------------------------------------------- */
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    try {
      // Nếu đã ended, tua về 0 trước
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Playback was blocked.";
      setError(
        /not allowed|user gesture/i.test(msg)
          ? "Your browser blocked autoplay. Click the Play button to start."
          : msg,
      );
      setStatus("error");
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setStatus("idle");
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped / 100;
  }, []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(audio.duration || 0, t));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  return {
    status,
    sourceType,
    duration,
    currentTime,
    volume,
    error,
    play,
    pause,
    stop,
    setVolume,
    seek,
  };
}

/**
 * Format giây thành mm:ss.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}