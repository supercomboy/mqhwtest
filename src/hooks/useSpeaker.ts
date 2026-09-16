import { useCallback, useEffect, useRef, useState } from "react";

export type SpeakerSourceType = "mp3" | "tone";

export type SpeakerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export interface SpeakerSourceOption {
  id: string;
  label: string;
  /** Đường dẫn tương đối trong `public/`. */
  file: string;
}

/**
 * Danh sách file test có thể chọn.
 * Thêm file mới: đặt vào `public/audio/` + thêm 1 entry ở đây.
 */
export const SPEAKER_SOURCES: SpeakerSourceOption[] = [
  { id: "test-1", label: "Sound 1", file: "audio/speaker-test.mp3" },
  { id: "test-2", label: "Sound 2", file: "audio/speaker-test-1.mp3" },
];

export interface UseSpeakerResult {
  status: SpeakerStatus;
  sourceType: SpeakerSourceType;
  sourceId: string;
  sources: SpeakerSourceOption[];
  duration: number;
  currentTime: number;
  volume: number;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  seek: (t: number) => void;
  setSourceId: (id: string) => void;
}

/**
 * Sinh WAV Blob chứa sine 440Hz với fade in/out — fallback khi MP3 lỗi.
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

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples * 2, true);

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
  const fallbackAttemptedRef = useRef(false);

  const [status, setStatus] = useState<SpeakerStatus>("loading");
  const [sourceType, setSourceType] = useState<SpeakerSourceType>("mp3");
  const [sourceId, setSourceIdState] = useState<string>(
    SPEAKER_SOURCES[0].id,
  );
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(70);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------
   * Effect: (re)load audio mỗi khi sourceId đổi
   * -------------------------------------------------------------- */
  useEffect(() => {
    // Tạo mới hoặc tái sử dụng audio element
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }

    // Dừng playback hiện tại (nếu có)
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    audio.preload = "metadata";
    audio.volume = volume / 100;

    // Reset state
    fallbackAttemptedRef.current = false;
    setStatus("loading");
    setSourceType("mp3");
    setDuration(0);
    setCurrentTime(0);
    setError(null);

    // Xoá tone URL cũ (nếu có)
    if (toneUrlRef.current) {
      URL.revokeObjectURL(toneUrlRef.current);
      toneUrlRef.current = null;
    }

    const source =
      SPEAKER_SOURCES.find((s) => s.id === sourceId) ?? SPEAKER_SOURCES[0];
    const mp3Path = `${import.meta.env.BASE_URL}${source.file}`;

    /* -------------- Event handlers -------------- */
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setStatus("idle");
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setStatus("playing");
    const handlePause = () => {
      if (!audio.ended) setStatus("paused");
    };
    const handleEnded = () => {
      setStatus("ended");
      setCurrentTime(audio.duration || 0);
    };
    const handleError = () => {
      // Nếu đã fallback rồi mà vẫn lỗi → báo lỗi thật
      if (fallbackAttemptedRef.current) {
        setError(
          "Could not load the audio file and tone fallback also failed.",
        );
        setStatus("error");
        return;
      }
      fallbackAttemptedRef.current = true;
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

    // Bắt đầu load nguồn MP3 mới
    audio.src = mp3Path;
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
    // volume chỉ đọc lúc mount effect; thay đổi volume không cần re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  /* ---------------------------------------------------------------
   * Cleanup khi unmount
   * -------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (toneUrlRef.current) {
        URL.revokeObjectURL(toneUrlRef.current);
        toneUrlRef.current = null;
      }
      audioRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------
   * Actions
   * -------------------------------------------------------------- */
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    try {
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Playback was blocked.";
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

  const setSourceId = useCallback(
    (id: string) => {
      if (!SPEAKER_SOURCES.some((s) => s.id === id)) return;
      if (id === sourceId) return;
      // Dừng playback trước khi đổi nguồn
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
      }
      setSourceIdState(id);
    },
    [sourceId],
  );

  return {
    status,
    sourceType,
    sourceId,
    sources: SPEAKER_SOURCES,
    duration,
    currentTime,
    volume,
    error,
    play,
    pause,
    stop,
    setVolume,
    seek,
    setSourceId,
  };
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}