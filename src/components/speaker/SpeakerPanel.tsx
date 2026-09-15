import { AlertCircle, Music, Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { formatTime, type SpeakerStatus } from "@/hooks/useSpeaker";
import type { UseSpeakerResult } from "@/hooks/useSpeaker";
import { cn } from "@/lib/utils";

interface SpeakerPanelProps {
  speaker: UseSpeakerResult;
  /**
   * Gọi khi user xác nhận nghe/không nghe.
   * Phase 6 truyền handler để update status vào context.
   */
  onConfirm: (heard: boolean) => void;
  /** Cho biết user đã xác nhận chưa. */
  confirmed: boolean;
}

/** Map SpeakerStatus → DeviceStatus để hiển thị badge. */
function toBadgeStatus(
  s: SpeakerStatus,
  sourceType: "mp3" | "tone",
): "ready" | "testing" | "passed" | "warning" | "error" | "not-available" {
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
    duration,
    currentTime,
    volume,
    error,
    play,
    pause,
    stop,
    setVolume,
    seek,
  } = speaker;

  const isPlaying = status === "playing";
  const isEnded = status === "ended";
  const canConfirm = (isEnded || status === "paused" || status === "idle") &&
    currentTime > 0 &&
    !confirmed;

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Source indicator */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
          sourceType === "mp3"
            ? "border-border bg-card text-muted-foreground"
            : "border-warning/30 bg-warning/5 text-warning",
        )}
      >
        {sourceType === "mp3" ? (
          <Music className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="font-mono">
          {sourceType === "mp3"
            ? "Source: audio/speaker-test.mp3"
            : "Source: generated 440 Hz sine tone (MP3 file not found)"}
        </span>
      </div>

      {/* Player */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Playback
          </p>
          <StatusBadge status={toBadgeStatus(status, sourceType)} />
        </div>

        {/* Progress + time */}
        <div className="mb-4 space-y-2">
          <Progress
            value={percent}
            aria-label="Playback progress"
            className="h-1.5"
          />
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="lg"
            onClick={isPlaying ? pause : play}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={status === "error"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5" aria-hidden="true" />
            )}
            {isPlaying ? "Pause" : isEnded ? "Play again" : "Play Test Sound"}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={stop}
            disabled={status === "idle" && currentTime === 0}
            aria-label="Stop"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            Stop
          </Button>
        </div>

        {/* Seek */}
        {duration > 0 && (
          <div className="mt-5 space-y-2">
            <label
              htmlFor="speaker-seek"
              className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="speaker-volume"
              className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              Volume
            </label>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
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

        {/* Error state */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-error/30 bg-error/5 p-3 text-xs">
            <AlertCircle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error"
              aria-hidden="true"
            />
            <p className="text-error">{error}</p>
          </div>
        )}
      </div>

      {/* Confirmation prompt */}
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          confirmed
            ? "border-success/30 bg-success/5"
            : canConfirm
              ? "border-primary/30 bg-primary/5"
              : "border-dashed border-border bg-card",
        )}
      >
        {confirmed ? (
          <p className="text-sm text-success">
            <strong className="font-semibold">Confirmed.</strong> You verified
            that you can hear the sound.
          </p>
        ) : canConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Audio playback started successfully. Please confirm that you can
              hear the sound clearly.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onConfirm(true)}
              >
                Yes, I hear it
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(false)}
              >
                No, I don't hear anything
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={stop}
                aria-label="Try again"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Press <strong className="font-semibold text-foreground">Play Test Sound</strong> and
            listen. You'll be asked to confirm what you heard.
          </p>
        )}
      </div>
    </div>
  );
}