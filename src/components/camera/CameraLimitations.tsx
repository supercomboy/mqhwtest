import { Info } from "lucide-react";

export function CameraLimitations() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-info"
        aria-hidden="true"
      />
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">About this test</p>
        <p>
          The browser can confirm that a camera stream is active and can
          preview the frames — but it{" "}
          <strong className="font-semibold text-foreground">cannot</strong>{" "}
          verify focus quality, exposure, color accuracy, or that the correct
          camera was selected. Those judgments are yours.
        </p>
        <p>
          If the preview is blank or black, check that the camera lens is not
          covered, that the correct camera is selected in your OS, and that no
          other app is holding exclusive access to it.
        </p>
        <p>
          <span className="font-medium text-foreground">Privacy:</span> video
          frames are rendered directly from your camera to the{" "}
          <span className="font-mono">&lt;video&gt;</span> element in your
          browser. Nothing is recorded, saved, or uploaded — screenshots only
          exist if you explicitly download them.
        </p>
      </div>
    </div>
  );
}