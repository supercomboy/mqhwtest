import { Info } from "lucide-react";

export function MicrophoneLimitations() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-info"
        aria-hidden="true"
      />
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">About this test</p>
        <p>
          The browser can confirm that your microphone is streaming audio and
          can measure the input level — but it{" "}
          <strong className="font-semibold text-foreground">cannot</strong>{" "}
          verify that the recording is clear, that the correct device is
          selected, or that the microphone hardware itself is healthy.
        </p>
        <p>
          That is why you are asked to confirm the result manually. If the
          input level does not respond, check that your microphone is not muted,
          that the correct input device is selected in your OS, and that no
          other application is holding exclusive access to it.
        </p>
        <p>
          <span className="font-medium text-foreground">Privacy:</span> audio is
          analysed entirely in your browser. Nothing is recorded, saved, or
          uploaded.
        </p>
      </div>
    </div>
  );
}