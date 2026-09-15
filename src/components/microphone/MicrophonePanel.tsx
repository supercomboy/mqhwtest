import {
  AlertCircle,
  CheckCircle2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
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

/** Map MicStatus → DeviceStatus để hiển thị badge. */
function toBadgeStatus(s: MicStatus, detected: boolean): DeviceStatus {
  switch (s) {
    case "idle":
      return "ready";
    case "requesting":
      return "permission-required";
    case "listening":
      return detected ? "testing" : "testing";
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
  insecure: "Insecure context",
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
    start,
    stop,
    reset,
  } = mic;

  const isActive = status === "listening";
  const isRequesting = status === "requesting";
  const canConfirm = status === "stopped" && detected && !confirmed;
  const badgeStatus = toBadgeStatus(status, detected);

  return (
    <div className="space-y-4">
      {/* Device status */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                isActive ? "bg-primary/10 text-primary" : "bg-secondary",
              )}
            >
              {isActive ? (
                <Mic className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MicOff
                  className="h-5 w-5 text-secondary-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Microphone
              </p>
              <p className="truncate text-sm font-medium" title={deviceLabel ?? undefined}>
                {deviceLabel ?? (isActive ? "Connected" : "Not connected")}
              </p>
            </div>
          </div>
          <StatusBadge status={badgeStatus} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-medium text-foreground">{STATUS_LABEL[status]}</span>
          </p>
          {detected && isActive && (
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-success">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Input detected
            </span>
          )}
        </div>
      </div>

      {/* Level meter */}
      <div className="rounded-lg border border-border bg-card p-4">
        <MicrophoneLevelMeter
          levelBarRef={levelBarRef}
          peak={peak}
          active={isActive}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isActive ? (
            <Button
              onClick={start}
              disabled={isRequesting || status === "unsupported" || status === "insecure"}
              size="lg"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {isRequesting ? "Requesting…" : "Start Test"}
            </Button>
          ) : (
            <Button onClick={stop} variant="secondary" size="lg">
              <Square className="h-4 w-4" aria-hidden="true" />
              Stop Test
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={reset}
            disabled={status === "idle" && !error}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
        </div>

        {/* Numeric readout */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border/60 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Level
            </p>
            <p className="font-mono text-lg tabular-nums">
              {level}
              <span className="text-xs text-muted-foreground">%</span>
            </p>
          </div>
          <div className="rounded border border-border/60 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Peak
            </p>
            <p className="font-mono text-lg tabular-nums">
              {peak}
              <span className="text-xs text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        {/* Hint */}
        {isActive && !detected && (
          <p className="mt-3 text-xs text-muted-foreground">
            Try speaking, tapping the microphone, or saying &quot;test&quot;.
          </p>
        )}
        {isActive && detected && (
          <p className="mt-3 text-xs text-success">
            Input detected. You can stop the test whenever you are ready.
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-xs">
          <AlertCircle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error"
            aria-hidden="true"
          />
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* Confirmation */}
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
            that the microphone input responds.
          </p>
        ) : canConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Test finished. Did the input level respond when you spoke or
              tapped the microphone?
            </p>
            <div className="flex flex-wrap gap-2">
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
          <p className="text-sm text-muted-foreground">
            Press{" "}
            <strong className="font-semibold text-foreground">
              Start Test
            </strong>{" "}
            and allow microphone access. Speak into the microphone and watch
            the input level. Then stop the test to record your result.
          </p>
        )}
      </div>
    </div>
  );
}