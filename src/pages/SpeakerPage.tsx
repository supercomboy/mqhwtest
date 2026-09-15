import { useState } from "react";
import { Volume2 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { SpeakerLimitations } from "@/components/speaker/SpeakerLimitations";
import { SpeakerPanel } from "@/components/speaker/SpeakerPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import type { DeviceStatus } from "@/types/device";

export function SpeakerPage() {
  useDocumentTitle("Speaker Test");
  const speaker = useSpeaker();
  const { getEntry, setStatus, reset: resetDeviceStatus } = useDeviceStatus();
  const entry = getEntry("speaker");

  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (heard: boolean) => {
    setConfirmed(true);
    const next: DeviceStatus = heard ? "passed" : "warning";
    const message = heard
      ? "User confirmed audio playback"
      : "User did not hear any sound";
    setStatus("speaker", next, message);
  };

  const handleReset = () => {
    speaker.stop();
    setConfirmed(false);
    resetDeviceStatus("speaker");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device Test"
        title="Speaker"
        description="Play a test tone through your speakers, adjust the volume, then confirm whether you can hear it clearly."
        action={<StatusBadge status={entry.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left: intro card */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
              <Volume2
                className="h-7 w-7 text-secondary-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold">Speaker playback test</p>
              <p className="text-sm text-muted-foreground">
                Use the player on the right. Adjust the volume slider to a
                comfortable level before starting.
              </p>
            </div>
            {entry.message && (
              <p className="font-mono text-xs text-muted-foreground">
                {entry.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!confirmed && speaker.status === "idle"}
            >
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Right: player */}
        <SpeakerPanel
          speaker={speaker}
          onConfirm={handleConfirm}
          confirmed={confirmed}
        />
      </div>

      <SpeakerLimitations />
    </div>
  );
}