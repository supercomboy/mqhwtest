import type { RefObject } from "react";

interface MicrophoneLevelMeterProps {
  levelBarRef: RefObject<HTMLDivElement | null>;
  /** Mức đỉnh — hiển thị như vạch dọc. */
  peak: number;
  /** Trạng thái đang nghe. */
  active: boolean;
}

export function MicrophoneLevelMeter({
  levelBarRef,
  peak,
  active,
}: MicrophoneLevelMeterProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Input Level
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span>peak {peak}%</span>
        </div>
      </div>

      {/* Track */}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-secondary"
        role="meter"
        aria-label="Microphone input level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={active ? peak : 0}
      >
        {/* Level bar — width set từ hook qua ref */}
        <div
          ref={levelBarRef}
          className="h-full rounded-full bg-primary transition-none"
          style={{ width: "0%" }}
        />

        {/* Peak marker */}
        {peak > 0 && (
          <div
            className="absolute top-0 h-full w-px bg-foreground/60"
            style={{ left: `${peak}%` }}
            aria-hidden="true"
          />
        )}

        {/* Tick marks 25/50/75 */}
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          <span className="w-px bg-border/60" />
          <span className="w-px bg-border/60" />
          <span className="w-px bg-border/60" />
          <span className="w-px bg-border/60" />
        </div>
      </div>

      {/* Numeric scale */}
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}