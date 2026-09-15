import { useMemo } from "react";
import { Info } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { SystemInfo } from "@/components/dashboard/SystemInfo";
import { DEVICES } from "@/data/devices";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import { detectCapabilities } from "@/utils/capabilities";

export function Dashboard() {
    useDocumentTitle("Dashboard");
  const { getEntry } = useDeviceStatus();
  const capabilities = useMemo(() => detectCapabilities(), []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="MQ Device Tester"
        description="Test your computer hardware directly from your browser. All tests run locally — nothing is uploaded."
      />

      <DashboardStats />

      <section
        aria-label="Available device tests"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {DEVICES.map((device) => {
          const entry = getEntry(device.id);
          return (
            <DeviceCard
              key={device.id}
              device={device}
              status={entry.status}
              capability={capabilities[device.id]}
            />
          );
        })}
      </section>

      <SystemInfo />

      <section className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-info"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">
          <strong className="font-semibold text-foreground">Privacy:</strong>{" "}
          Your camera and microphone data are processed locally in your browser.
          No camera or microphone data is uploaded to a server.
        </p>
      </section>
    </div>
  );
}