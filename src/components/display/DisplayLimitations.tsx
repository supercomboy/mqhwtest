import { Info } from "lucide-react";

export function DisplayLimitations() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">About this test</p>
        <p>
          The browser can render precise colors and fullscreen patterns, but it{" "}
          <strong className="font-semibold text-foreground">cannot</strong>{" "}
          automatically detect dead pixels, stuck pixels, backlight bleed, or
          color calibration issues. Those are things only your eyes can judge.
        </p>
        <p>
          Some monitors apply color profiles or HDR processing that alters what
          you see. For the most accurate results, disable any OS-level color
          profile or night-shift filter before running the test.
        </p>
        <p>
          <span className="font-medium text-foreground">Shortcuts:</span>{" "}
          <span className="font-mono">← →</span> or{" "}
          <span className="font-mono">Space</span> to navigate,{" "}
          <span className="font-mono">H</span> to toggle controls,{" "}
          <span className="font-mono">ESC</span> to exit fullscreen.
        </p>
      </div>
    </div>
  );
}