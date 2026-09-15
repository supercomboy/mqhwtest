import { useEffect, useRef } from "react";

import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import { DEVICES } from "@/data/devices";

/**
 * Một vùng aria-live duy nhất cho toàn app.
 *
 * Lý do: nhiều component có role="status" riêng biệt có thể khiến screen
 * reader đọc chồng chéo, khó theo dõi. Gộp về 1 region → thông báo tuần tự,
 * rõ ràng.
 *
 * Đặt ở root layout, một lần duy nhất.
 */
export function AriaLiveRegion() {
  const { getEntry } = useDeviceStatus();
  const regionRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const interval = window.setInterval(() => {
      const newMessages: string[] = [];
      for (const device of DEVICES) {
        const entry = getEntry(device.id);
        const key = `${entry.status}|${entry.message ?? ""}`;
        const prevKey = previousRef.current[device.id];
        if (prevKey !== key && entry.status !== "ready") {
          const label = entry.message ?? entry.status;
          newMessages.push(`${device.title}: ${label}`);
        }
        previousRef.current[device.id] = key;
      }
      if (newMessages.length > 0 && regionRef.current) {
        regionRef.current.textContent = newMessages.join(". ");
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [getEntry]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}