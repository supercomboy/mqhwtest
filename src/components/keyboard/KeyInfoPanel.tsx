import type { KeyEventRecord } from "@/hooks/useKeyboard";
import { getKeyByCode } from "@/data/keyboardLayout";
import {
  formatKeyName,
  getLocationLabel,
  getModifierList,
} from "@/utils/keyboard";

interface KeyInfoPanelProps {
  lastEvent: KeyEventRecord | null;
}

export function KeyInfoPanel({ lastEvent }: KeyInfoPanelProps) {
  if (!lastEvent) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Press any key on your physical keyboard to begin.
        </p>
      </div>
    );
  }

  const keyDef = getKeyByCode(lastEvent.code);
  const label = keyDef?.label ?? formatKeyName(lastEvent.key);
  const modifiers = getModifierList(lastEvent);

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          Last Key
        </p>
        {lastEvent.repeat && (
          <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-warning">
            Repeated
          </span>
        )}
      </div>

      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold tracking-tight leading-none">
          {label}
        </span>
        {modifiers.length > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {modifiers.join(" + ")}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-1.5 text-[11px] md:grid-cols-4">
        <Row label="Key" value={lastEvent.key === " " ? "Space" : lastEvent.key} mono />
        <Row label="Code" value={lastEvent.code} mono />
        <Row label="Location" value={getLocationLabel(lastEvent.location)} />
        <Row
          label="Modifiers"
          value={modifiers.length > 0 ? modifiers.join(", ") : "none"}
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0 rounded border border-border/60 px-1.5 py-1">
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`truncate ${mono ? "font-mono tabular-nums" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}