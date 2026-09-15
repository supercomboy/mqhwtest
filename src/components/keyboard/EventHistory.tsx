import type { KeyEventRecord } from "@/hooks/useKeyboard";
import { formatKeyName, getModifierList } from "@/utils/keyboard";
import { cn } from "@/lib/utils";

interface EventHistoryProps {
  history: KeyEventRecord[];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour12: false });
}

export function EventHistory({ history }: EventHistoryProps) {
  return (
    <div className="rounded-md border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Event History
        </p>
        <p className="font-mono text-[9px] text-muted-foreground tabular-nums">
          {history.length} / 50
        </p>
      </div>

      {/* Body */}
      {history.length === 0 ? (
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">
            No events yet. Press keys to populate history.
          </p>
        </div>
      ) : (
        <div
          className="flex gap-1.5 overflow-x-auto px-2 py-1.5"
          role="list"
          aria-label="Recent keyboard events"
        >
          {history.map((record, idx) => {
            const mods = getModifierList(record);
            const label = formatKeyName(record.key);
            const isLatest = idx === 0;

            return (
              <div
                key={`${record.timestamp}-${idx}`}
                role="listitem"
                className={cn(
                  "flex w-[92px] shrink-0 flex-col gap-0.5 rounded border px-2 py-1 font-mono text-[10px]",
                  isLatest
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-background",
                )}
              >
                <span className="text-[9px] tabular-nums text-muted-foreground leading-none">
                  {formatTime(record.timestamp)}
                </span>
                <span className="truncate text-xs font-medium leading-tight">
                  {mods.length > 0 && (
                    <span className="text-muted-foreground">
                      {mods.join("+")}+
                    </span>
                  )}
                  {label}
                </span>
                <span className="truncate text-[9px] text-muted-foreground leading-none">
                  {record.code}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}