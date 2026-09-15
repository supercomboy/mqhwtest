import { Info } from "lucide-react";

export function SpeakerLimitations() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-info"
        aria-hidden="true"
      />
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">About this test</p>
        <p>
          The browser can confirm that an audio element started playing — but
          it <strong className="font-semibold text-foreground">cannot</strong>{" "}
          verify that your speakers actually emit sound, that they are wired
          correctly, or that your OS output is set to the right device.
        </p>
        <p>
          That is why you are asked to confirm manually at the end. If you
          don't hear anything, check your system volume, output device, and
          physical connections before assuming the speaker is faulty.
        </p>
        <p>
          <span className="font-medium text-foreground">Autoplay note:</span>{" "}
          Browsers require a user gesture before playing audio. If playback
          doesn't start, click the Play button again.
        </p>
      </div>
    </div>
  );
}