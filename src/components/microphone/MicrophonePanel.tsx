import {
  AlertCircle,
  CheckCircle2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { MicrophoneLevelMeter } from "@/components/microphone/MicrophoneLevelMeter";
import { Button } from "@/components/ui/button";
import type { MicStatus, UseMicrophoneResult } from "@/hooks/useMicrophone";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types/device";

interface MicrophonePanelProps {
  mic: UseMicrophoneResult;
  onConfirm: (works: boolean) => void;
  confirmed: boolean;
}

function toBadgeStatus(s: MicStatus): DeviceStatus {
  switch (s) {
    case "idle":
      return "ready";
    case "requesting":
      return "permission-required";
    case "listening":
      return "testing";
    case "stopped":
      return "ready";
    case "denied":
      return "error";
    case "no-device":
      return "not-available";
    case "unsupported":
      return "not-available";
    case "insecure":
      return "error";
    case "error":
      return "error";
  }
}

const STATUS_LABEL: Record<MicStatus, string> = {
  idle: "Ready",
  requesting: "Requesting permission…",
  listening: "Listening",
  stopped: "Stopped",
  denied: "Permission denied",
  "no-device": "No microphone",
  unsupported: "Not supported",
  insecure: "Insecure context — use HTTPS or localhost",
  error: "Error",
};

export function MicrophonePanel({
  mic,
  onConfirm,
  confirmed,
}: MicrophonePanelProps) {
  const {
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
  } = mic;

  const isActive = status === "listening";
  const isRequesting = status === "requesting";
  const canConfirm = status === "stopped" && detected && !confirmed;

  return (
    <div className="space-y-3">
      {/* Device status */}
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded",
                isActive ? "bg-primary/10 text-primary" : "bg-secondary",
              )}
            >
              {isActive ? (
                <Mic className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MicOff
                  className="h-4 w-4 text-secondary-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Microphone
              </p>
              <p
                className="truncate text-xs font-medium"
                title={deviceLabel ?? undefined}
              >
                {deviceLabel ?? (isActive ? "Connected" : "Not connected")}
              </p>
            </div>
          </div>
          <StatusBadge status={toBadgeStatus(status)} />
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {STATUS_LABEL[status]}
            </span>
          </p>
          {detected && isActive && (
            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-success">
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              Input detected
            </span>
          )}
        </div>
      </div>

      {/* Level meter */}
      <div className="rounded-md border border-border bg-card p-3">
        <MicrophoneLevelMeter
          levelBarRef={levelBarRef}
          peak={peak}
          active={isActive}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isActive ? (
            <Button
              onClick={start}
              disabled={isRequesting || status === "unsupported"}
              size="sm"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {isRequesting ? "Requesting…" : "Start Test"}
            </Button>
          ) : (
            <Button onClick={stop} variant="secondary" size="sm">
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              Stop Test
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={status === "idle" && !error}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Reset
          </Button>
        </div>

        {/* Numeric readout */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded border border-border/60 px-2 py-1">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Level
            </p>
            <p className="font-mono text-sm tabular-nums">
              {level}
              <span className="text-[10px] text-muted-foreground">%</span>
            </p>
          </div>
          <div className="rounded border border-border/60 px-2 py-1">
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Peak
            </p>
            <p className="font-mono text-sm tabular-nums">
              {peak}
              <span className="text-[10px] text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        {/* Playback section */}
        {supportsRecording && hasRecording && (
          <div className="mt-3 rounded border border-border/60 bg-background p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Recording
              </p>
              <p className="font-mono text-[9px] text-muted-foreground">
                {isActive ? "recording…" : "ready"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {!isPlayingBack ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={playRecording}
                  disabled={isActive}
                >
                  <Play className="h-3 w-3" aria-hidden="true" />
                  Play recording
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={stopPlayback}>
                  <Square className="h-3 w-3" aria-hidden="true" />
                  Stop playback
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={clearRecording}
                disabled={isActive}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Hints */}
        {isActive && !detected && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Try speaking, tapping the microphone, or saying &quot;test&quot;.
          </p>
        )}
        {isActive && detected && (
          <p className="mt-2 text-[10px] text-success">
            Input detected. Stop the test whenever you are ready — then you can
            play the recording back.
          </p>
        )}
        {!supportsRecording && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Recording playback is not available in this browser.
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded border border-error/30 bg-error/5 p-2 text-[10px]">
          <AlertCircle
            className="mt-0.5 h-3 w-3 shrink-0 text-error"
            aria-hidden="true"
          />
          <p className="text-error">{error}</p>
        </div>
      )}

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
            that the microphone input responds.
          </p>
        ) : canConfirm ? (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              Test finished. Did the input level respond when you spoke or
              tapped the microphone?
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => onConfirm(true)}>
                Yes, it responded
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(false)}
              >
                No, no response
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <strong className="font-semibold text-foreground">
              Start Test
            </strong>{" "}
            and allow microphone access. Speak into the microphone and watch
            the input level. Stop the test to record your result.
          </p>
        )}
      </div>
    </div>
  );
}