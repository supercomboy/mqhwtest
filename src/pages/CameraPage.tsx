import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CameraPanel } from "@/components/camera/CameraPanel";
import { CameraLimitations } from "@/components/camera/CameraLimitations";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useCamera } from "@/hooks/useCamera";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import type { DeviceStatus } from "@/types/device";

export function CameraPage() {
  useDocumentTitle("Camera Test");
  const camera = useCamera();
  const { getEntry, setStatus, reset: resetDeviceStatus } =
    useDeviceStatus();
  const entry = getEntry("camera");
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (works: boolean) => {
    setConfirmed(true);
    const next: DeviceStatus = works ? "passed" : "warning";
    const message = works
      ? "User confirmed camera preview was visible"
      : "User reported blank camera preview";
    setStatus("camera", next, message);
  };

  const handleReset = () => {
    camera.reset();
    setConfirmed(false);
    resetDeviceStatus("camera");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device Test"
        title="Camera"
        description="Preview the live feed from your webcam. Video frames stay entirely inside your browser — nothing is recorded or uploaded."
        action={<StatusBadge status={entry.status} />}
      />

      <CameraPanel
        camera={{ ...camera, reset: handleReset }}
        onConfirm={handleConfirm}
        confirmed={confirmed}
      />

      <CameraLimitations />
    </div>
  );
}