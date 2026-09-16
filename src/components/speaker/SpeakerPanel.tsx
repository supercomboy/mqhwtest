import {
  AlertCircle,
  Music,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  formatTime,
  type SpeakerStatus,
  type UseSpeakerResult,
} from "@/hooks/useSpeaker";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types/device";

interface SpeakerPanelProps {
  speaker: UseSpeakerResult;
  onConfirm: (heard: boolean) => void;
  confirmed: boolean;
}

function toBadgeStatus(
  s: SpeakerStatus,
  sourceType: "mp3" | "tone",
): DeviceStatus {
  if (s === "error") return "error";
  if (sourceType === "tone") return "warning";
  if (s === "playing" || s === "paused") return "testing";
  if (s === "ended") return "testing";
  return "ready";
}

export function SpeakerPanel({
  speaker,
  onConfirm,
  confirmed,
}: SpeakerPanelProps) {
  const {
    status,
    sourceType,
    sourceId,
    sources,
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
  } = speaker;

  const isPlaying = status === "playing";
  const isEnded = status === "ended";
  const canConfirm =
    (isEnded || status === "paused" || status === "idle") &&
    currentTime > 0 &&
    !confirmed;

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentSource =
    sources.find((s) => s.id === sourceId) ?? sources[0];

  return (
    <div className="space-y-3">
      {/* Source selector */}
      <div className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2.5 py-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Test sound
        </p>
        <div className="flex gap-1">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSourceId(s.id)}
              disabled={isPlaying}
              aria-pressed={sourceId === s.id}
              className={cn(
                "rounded px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sourceId === s.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isPlaying && "cursor-not-allowed opacity-50",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source indicator (mp3 / fallback tone) */}
      <div
        className={cn(
          "flex items-center gap-2 rounded border px-2.5 py-1.5 text-[10px]",
          sourceType === "mp3"
            ? "border-border bg-card text-muted-foreground"
            : "border-warning/30 bg-warning/5 text-warning",
        )}
      >
        {sourceType === "mp3" ? (
          <Music className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate font-mono">
          {sourceType === "mp3"
            ? `Source: ${currentSource.file}`
            : "Source: generated 440 Hz sine tone (MP3 not found)"}
        </span>
      </div>

      {/* Player */}
      <div className="rounded-md border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Playback
          </p>
          <StatusBadge status={toBadgeStatus(status, sourceType)} />
        </div>

        {/* Progress + time */}
        <div className="mb-2 space-y-1">
          <Progress
            value={percent}
            aria-label="Playback progress"
            className="h-1"
          />
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="sm"
            onClick={isPlaying ? pause : play}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={status === "error" || status === "loading"}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isPlaying ? "Pause" : isEnded ? "Play again" : "Play Test Sound"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={stop}
            disabled={status === "idle" && currentTime === 0}
            aria-label="Stop"
          >
            <Square className="h-3 w-3" aria-hidden="true" />
            Stop
          </Button>
        </div>

        {/* Seek */}
        {duration > 0 && (
          <div className="mt-3 space-y-1">
            <label
              htmlFor="speaker-seek"
              className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Seek
            </label>
            <Slider
              id="speaker-seek"
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([v]) => seek(v)}
              aria-label="Seek playback position"
            />
          </div>
        )}

        {/* Volume */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="speaker-volume"
              className="flex items-center gap-1 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <Volume2 className="h-3 w-3" aria-hidden="true" />
              Volume
            </label>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {volume}%
            </span>
          </div>
          <Slider
            id="speaker-volume"
            value={[volume]}
            max={100}
            step={1}
            onValueChange={([v]) => setVolume(v)}
            aria-label="Volume"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 flex items-start gap-1.5 rounded border border-error/30 bg-error/5 p-2 text-[10px]">
            <AlertCircle
              className="mt-0.5 h-3 w-3 shrink-0 text-error"
              aria-hidden="true"
            />
            <p className="text-error">{error}</p>
          </div>
        )}
      </div>

      {/* Confirmation */}
      <div
        className={cn(
          "rounded-md border p-3 transition-colors",
          confirmed
            ? "border-success/30 bg-success/5"
            : canConfirm
              ? "border-primary/30 bg-primary/5"
              : "border-dashed border-border bg-card",
        )}
      >
        {confirmed ? (
          <p className="text-xs text-success">
            <strong className="font-semibold">Confirmed.</strong> You verified
            that you can hear the sound.
          </p>
        ) : canConfirm ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              Audio playback started successfully. Please confirm that you can
              hear the sound clearly.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => onConfirm(true)}>
                Yes, I hear it
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(false)}
              >
                No, I don't hear anything
              </Button>
              <Button size="sm" variant="ghost" onClick={stop}>
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick a test sound above, press{" "}
            <strong className="font-semibold text-foreground">
              Play Test Sound
            </strong>{" "}
            and listen. You'll be asked to confirm what you heard.
          </p>
        )}
      </div>
    </div>
  );
}