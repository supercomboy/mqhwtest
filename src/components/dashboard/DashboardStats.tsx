import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";

export function DashboardStats() {
  const { stats, resetAll } = useDeviceStatus();
  const tested = stats.passed + stats.warning + stats.error;
  const percent = stats.total === 0 ? 0 : (tested / stats.total) * 100;

  return (
    <section
      aria-label="Test progress"
      className="rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
            <CheckCircle2
              className="h-5 w-5 text-secondary-foreground"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Session Progress
            </p>
            <p className="text-sm font-medium" aria-live="polite">
              <span className="tabular-nums">{tested}</span>{" "}
              <span className="text-muted-foreground">
                of {stats.total} devices tested
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden w-48 sm:block">
            <Progress
              value={percent}
              aria-label={`${tested} of ${stats.total} devices tested`}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            disabled={tested === 0}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset all
          </Button>
        </div>
      </div>
    </section>
  );
}