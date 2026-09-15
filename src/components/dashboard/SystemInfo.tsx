import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Globe,
  Lock,
  LockOpen,
  Monitor,
  XCircle,
} from "lucide-react";

import {
  detectCapabilities,
  getBrowserInfo,
  type BrowserInfo,
} from "@/utils/capabilities";
import { DEVICES } from "@/data/devices";
import { cn } from "@/lib/utils";

export function SystemInfo() {
  const [info, setInfo] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    setInfo(getBrowserInfo());
  }, []);

  if (!info) return null;

  const capabilities = detectCapabilities();

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Environment</h2>
        <p className="text-xs text-muted-foreground">
          Detected browser capabilities for this session.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs">
          <Monitor
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <dt className="text-muted-foreground">Platform:</dt>
          <dd className="truncate font-mono">{info.platform}</dd>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Globe
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <dt className="text-muted-foreground">Language:</dt>
          <dd className="font-mono">{info.language}</dd>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {info.secureContext ? (
            <Lock
              className="h-3.5 w-3.5 shrink-0 text-success"
              aria-hidden="true"
            />
          ) : (
            <LockOpen
              className="h-3.5 w-3.5 shrink-0 text-warning"
              aria-hidden="true"
            />
          )}
          <dt className="text-muted-foreground">Secure context:</dt>
          <dd
            className={cn(
              "font-mono",
              info.secureContext ? "text-success" : "text-warning",
            )}
          >
            {info.secureContext ? "yes" : "no — camera & mic blocked"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          API Support
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DEVICES.map((device) => {
            const cap = capabilities[device.id];
            return (
              <li
                key={device.id}
                className="flex items-center gap-2 text-xs"
                aria-label={`${device.title}: ${cap.supported ? "supported" : "not supported"}`}
              >
                {cap.supported ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="h-3.5 w-3.5 shrink-0 text-error"
                    aria-hidden="true"
                  />
                )}
                <span className="text-muted-foreground">
                  {device.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}