import { useEffect, useMemo } from "react";
import { RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { KeyInfoPanel } from "@/components/keyboard/KeyInfoPanel";
import { KeyboardLayout } from "@/components/keyboard/KeyboardLayout";
import { KeyboardLimitations } from "@/components/keyboard/KeyboardLimitations";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TOTAL_KEY_COUNT } from "@/data/keyboardLayout";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useDeviceStatus } from "@/providers/DeviceStatusProvider";
import type { DeviceStatus } from "@/types/device";

export function KeyboardPage() {
  const { pressed, tested, lastEvent, reset } = useKeyboard();
  const { getEntry, setStatus, reset: resetDeviceStatus } = useDeviceStatus();

  const entry = getEntry("keyboard");
  const testedCount = tested.size;
  const percent = (testedCount / TOTAL_KEY_COUNT) * 100;

  useEffect(() => {
    if (testedCount === 0) return;
    const nextStatus: DeviceStatus = testedCount >= 10 ? "passed" : "testing";
    const message =
      testedCount >= 10
        ? `${testedCount} keys verified`
        : `${testedCount} keys registered`;
    if (entry.status !== nextStatus || entry.message !== message) {
      setStatus("keyboard", nextStatus, message);
    }
  }, [testedCount, entry.status, entry.message, setStatus]);

  const statusMessage = useMemo(() => {
    if (entry.message) return entry.message;
    return "Press any key on your physical keyboard.";
  }, [entry.message]);

  const handleReset = () => {
    reset();
    resetDeviceStatus("keyboard");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device Test"
        title="Keyboard"
        description="Press any key on your physical keyboard. Space, arrows, and Tab are intercepted so the page will not scroll or lose focus."
        action={<StatusBadge status={entry.status} />}
      />

      {/* Progress + Reset */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{statusMessage}</span>
            <span className="font-mono tabular-nums">
              {testedCount} / {TOTAL_KEY_COUNT}
            </span>
          </div>
          <Progress value={percent} aria-label="Keyboard test progress" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={testedCount === 0 && !lastEvent}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>

      {/* Last Key — full width */}
      <KeyInfoPanel lastEvent={lastEvent} />

      {/* Keyboard layout — to hơn */}
      <section
        aria-label="Keyboard layout"
        className="overflow-x-auto rounded-lg border border-border bg-secondary/30 p-4 lg:overflow-x-visible"
        style={
          {
            containerType: "inline-size",
            "--kb-u": "clamp(28px, 4.5cqw, 56px)",
          } as React.CSSProperties
        }
      >
        <div className="min-w-[680px] lg:min-w-0">
          <KeyboardLayout pressed={pressed} tested={tested} />
        </div>
      </section>

      <KeyboardLimitations />
    </div>
  );
}