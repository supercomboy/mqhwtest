import {
  AlertCircle,
  Camera as CameraIcon,
  CameraOff,
  Download,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { CameraStatus, UseCameraResult } from "@/hooks/useCamera";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types/device";

interface CameraPanelProps {
  camera: UseCameraResult;
  onConfirm: (works: boolean) => void;
  confirmed: boolean;
}

function toBadgeStatus(s: CameraStatus): DeviceStatus {
  switch (s) {
    case "idle":
      return "ready";
    case "requesting":
      return "permission-required";
    case "streaming":
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
    case "in-use":
      return "error";
    case "error":
      return "error";
  }
}

const STATUS_LABEL: Record<CameraStatus, string> = {
  idle: "Ready",
  requesting: "Requesting permission…",
  streaming: "Streaming",
  stopped: "Stopped",
  denied: "Permission denied",
  "no-device": "No camera",
  unsupported: "Not supported",
  insecure: "Insecure context",
  "in-use": "Camera in use",
  error: "Error",
};

export function CameraPanel({
  camera,
  onConfirm,
  confirmed,
}: CameraPanelProps) {
  const {
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
  } = camera;

  const isActive = status === "streaming";
  const isRequesting = status === "requesting";
  const canConfirm = status === "stopped" && hasStreamedOnce && !confirmed;

  const handleScreenshot = () => {
    const dataUrl = captureScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `mq-camera-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
                <CameraIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CameraOff
                  className="h-5 w-5 text-secondary-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Camera
              </p>
              <p
                className="truncate text-sm font-medium"
                title={deviceLabel ?? undefined}
              >
                {deviceLabel ?? (isActive ? "Connected" : "Not connected")}
              </p>
            </div>
          </div>
          <StatusBadge status={toBadgeStatus(status)} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {STATUS_LABEL[status]}
            </span>
          </p>
          {dimensions && isActive && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
              {dimensions.width} × {dimensions.height}
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "h-full w-full object-contain",
              mirror && "scale-x-[-1]",
            )}
            aria-label="Live camera preview"
          />

          {/* Overlay khi chưa streaming */}
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 text-center text-white/70">
              <CameraOff className="h-8 w-8" aria-hidden="true" />
              <p className="text-sm">Camera preview will appear here</p>
            </div>
          )}

          {/* Live indicator */}
          {isActive && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-white">
                Live
              </span>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3">
          <div className="flex items-center gap-2">
            {!isActive ? (
              <Button
                onClick={start}
                disabled={
                  isRequesting ||
                  status === "unsupported" ||
                  status === "insecure"
                }
                size="sm"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {isRequesting ? "Requesting…" : "Start Camera"}
              </Button>
            ) : (
              <Button onClick={stop} variant="secondary" size="sm">
                <Square className="h-4 w-4" aria-hidden="true" />
                Stop Camera
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={status === "idle" && !error}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleScreenshot}
              disabled={!isActive}
              aria-label="Take screenshot and download"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Screenshot
            </Button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 select-none">
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Mirror
            </span>
            <Switch
              checked={mirror}
              onCheckedChange={setMirror}
              aria-label="Toggle mirror mode"
            />
          </label>
        </div>
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

      {/* Hint */}
      {isActive && (
        <p className="text-xs text-muted-foreground">
          If the preview shows your camera, the stream is active. Click{" "}
          <strong className="font-semibold text-foreground">
            Screenshot
          </strong>{" "}
          to save a PNG locally, or{" "}
          <strong className="font-semibold text-foreground">Stop</strong> when
          you are done to record your result.
        </p>
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
            that the camera feed was visible.
          </p>
        ) : canConfirm ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Test finished. Did you see a live image from your camera?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onConfirm(true)}>
                Yes, I saw the preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onConfirm(false)}
              >
                No, image was blank
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Press{" "}
            <strong className="font-semibold text-foreground">
              Start Camera
            </strong>{" "}
            and allow camera access. Then stop the test to record your result.
          </p>
        )}
      </div>
    </div>
  );
}