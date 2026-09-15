import { useEffect, useState } from "react";
import { Monitor, Play } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { DisplayLimitations } from "@/components/display/DisplayLimitations";
import { DisplayTestOverlay } from "@/components/display/DisplayTestOverlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import type { DeviceStatus } from "@/types/device";

export function DisplayPage() {
  useDocumentTitle("Display Test");
  const { getEntry, setStatus, reset: resetDeviceStatus } =
    useDeviceStatus();
  const entry = getEntry("display");

  const [overlayActive, setOverlayActive] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  /** Bắt đầu: request fullscreen + bật overlay. Phải cùng click handler. */
  const handleStart = () => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (typeof el.requestFullscreen === "function") {
        void el.requestFullscreen();
      } else if (typeof el.webkitRequestFullscreen === "function") {
        void el.webkitRequestFullscreen();
      }
    } catch {
      /* overlay vẫn chạy dù fullscreen fail */
    }
    setOverlayActive(true);
    setReviewed(false);
  };

  /** Callback từ overlay khi user thoát. */
  const handleOverlayClose = (completed: boolean) => {
    setOverlayActive(false);
    if (completed) {
      setReviewed(true);
    }
  };

  /** Confirm sau khi xem xong. */
  const handleConfirm = (ok: boolean) => {
    setConfirmed(true);
    const next: DeviceStatus = ok ? "passed" : "warning";
    const message = ok
      ? "User completed and confirmed the display test"
      : "User reported display issues";
    setStatus("display", next, message);
  };

  const handleReset = () => {
    setReviewed(false);
    setConfirmed(false);
    resetDeviceStatus("display");
  };

  /** Khi unmount mà vẫn còn overlay → exit fullscreen. */
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const showConfirmPrompt = reviewed && !confirmed;
  const showConfirmSuccess = confirmed;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device Test"
        title="Display"
        description="Fullscreen test patterns for color, gradient, contrast, and pixel uniformity. Patterns change every click or keypress."
        action={<StatusBadge status={entry.status} />}
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
            <Monitor
              className="h-7 w-7 text-secondary-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold">Fullscreen display test</p>
            <p className="max-w-md text-sm text-muted-foreground">
              15 patterns in sequence: 8 solid colors, RGB gradients,
              grayscale, contrast scale, shadow and highlight detail,
              geometry, and pixel grid.
            </p>
          </div>
          <Button onClick={handleStart} size="lg" disabled={overlayActive}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Start Fullscreen Test
          </Button>
          {entry.message && (
            <p className="font-mono text-xs text-muted-foreground">
              {entry.message}
            </p>
          )}
          {confirmed && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Confirmation prompt — chỉ hiện sau khi user thoát overlay đã xem đủ */}
      {showConfirmPrompt && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">
              You reviewed the full pattern sequence. Did all patterns look
              correct — no dead pixels, no color banding, no clipping?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleConfirm(true)}>
                Yes, all patterns looked good
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConfirm(false)}
              >
                No, I saw an issue
              </Button>
              <Button size="sm" variant="ghost" onClick={handleStart}>
                Run again
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSuccess && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm text-success">
            <strong className="font-semibold">Confirmed.</strong> You verified
            the display test patterns.
          </p>
        </div>
      )}

      <DisplayLimitations />

      {/* Fullscreen overlay */}
      {overlayActive && (
        <DisplayTestOverlay onClose={handleOverlayClose} />
      )}
    </div>
  );
}