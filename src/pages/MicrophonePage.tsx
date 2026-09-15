import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { MicrophoneLimitations } from "@/components/microphone/MicrophoneLimitations";
import { MicrophonePanel } from "@/components/microphone/MicrophonePanel";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import type { DeviceStatus } from "@/types/device";

export function MicrophonePage() {
  const mic = useMicrophone();
  const { getEntry, setStatus, reset: resetDeviceStatus } =
    useDeviceStatus();
  const entry = getEntry("microphone");
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (works: boolean) => {
    setConfirmed(true);
    const next: DeviceStatus = works ? "passed" : "warning";
    const message = works
      ? "User confirmed microphone input responds"
      : "User reported no microphone response";
    setStatus("microphone", next, message);
  };

  const handleReset = () => {
    mic.reset();
    setConfirmed(false);
    resetDeviceStatus("microphone");
  };

  // Hook's reset is separate from confirm reset — wrap both
  const reset = () => {
    handleReset();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device Test"
        title="Microphone"
        description="Speak into your microphone and watch the input level respond in real time. Audio is analysed locally — nothing is uploaded."
        action={<StatusBadge status={entry.status} />}
      />

      <MicrophonePanel
        mic={{ ...mic, reset }}
        onConfirm={handleConfirm}
        confirmed={confirmed}
      />

      <MicrophoneLimitations />
    </div>
  );
}