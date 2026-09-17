import { useMemo } from "react";
import { Info } from "lucide-react";

import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { SystemInfo } from "@/components/dashboard/SystemInfo";
import { DEVICES } from "@/data/devices";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import { detectCapabilities } from "@/utils/capabilities";

export function Dashboard() {
  useDocumentTitle("Dashboard");
  const { getEntry } = useDeviceStatus();
  const capabilities = useMemo(() => detectCapabilities(), []);
  const base = import.meta.env.BASE_URL;

  return (
    <div className="space-y-6">
      {/* Logo header — theme-aware */}
      <header className="flex flex-col items-center gap-2 pb-2 text-center">
        <img
          src={`${base}logo.png`}
          alt="MQ Device Tester logo"
          width={80}
          height={80}
          className="h-30 w-30 object-contain dark:hidden"
        />
        <img
          src={`${base}logo1.png`}
          alt=""
          aria-hidden="true"
          width={80}
          height={80}
          className="hidden h-30 w-30 object-contain dark:block"
        />
      </header>

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