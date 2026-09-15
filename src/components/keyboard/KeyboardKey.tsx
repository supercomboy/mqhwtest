import { memo, type CSSProperties } from "react";

import type { KeyDef } from "@/data/keyboardLayout";
import { MODIFIER_CODES } from "@/utils/keyboard";
import { cn } from "@/lib/utils";

type KeyboardKeyVariant = "function" | "main" | "cluster";

interface KeyboardKeyProps {
  keyDef: KeyDef;
  isPressed: boolean;
  isTested: boolean;
  variant?: KeyboardKeyVariant;
}

function KeyboardKeyImpl({
  keyDef,
  isPressed,
  isTested,
  variant = "main",
}: KeyboardKeyProps) {
  const isModifier = MODIFIER_CODES.has(keyDef.code);

  const style: CSSProperties = {};

  if (variant === "main" && keyDef.width !== undefined) {
    // 1u = 4 cells trong grid 60 cols
    style.gridColumn = `span ${Math.round(keyDef.width * 4)}`;
  } else if (variant === "cluster") {
    if (keyDef.gridRow !== undefined) style.gridRow = keyDef.gridRow;
    if (keyDef.gridCol !== undefined) style.gridColumn = keyDef.gridCol;
    if (keyDef.rowSpan !== undefined) {
      style.gridRowEnd = `span ${keyDef.rowSpan}`;
    }
    if (keyDef.colSpan !== undefined) {
      style.gridColumnEnd = `span ${keyDef.colSpan}`;
    }
  }
  // variant "function": để grid parent tự chia cột — mỗi key 1 cell

  // Font size co theo kích thước key
  const labelLength = keyDef.label.length;
  const fontStyle: CSSProperties =
    labelLength > 4
      ? { fontSize: "clamp(8px, calc(var(--kb-u) * 0.20), 11px)" }
      : { fontSize: "clamp(9px, calc(var(--kb-u) * 0.26), 13px)" };

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={`${keyDef.label}, ${isPressed ? "pressed" : isTested ? "tested" : "not tested"}`}
      aria-pressed={isPressed}
      style={style}
      className={cn(
        "relative flex select-none items-center justify-center overflow-hidden rounded border px-1 text-center transition-colors duration-75",
        "h-[var(--kb-u)]",
        !isPressed && !isTested && "border-border bg-card text-foreground",
        !isPressed && isTested && "border-success/40 bg-success/10 text-foreground",
        isPressed && "border-primary bg-primary text-primary-foreground shadow-sm",
        isModifier && "font-medium",
      )}
    >
      <span
        className="flex flex-col items-center justify-center leading-none"
        style={fontStyle}
      >
        {keyDef.sublabel && (
          <span
            className={cn(
              "text-[0.72em] leading-tight",
              isPressed ? "opacity-80" : "text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {keyDef.sublabel}
          </span>
        )}
        <span className="tracking-tight">{keyDef.label}</span>
      </span>
    </div>
  );
}

export const KeyboardKey = memo(KeyboardKeyImpl, (prev, next) => {
  return (
    prev.isPressed === next.isPressed &&
    prev.isTested === next.isTested &&
    prev.keyDef.code === next.keyDef.code &&
    prev.variant === next.variant
  );
});