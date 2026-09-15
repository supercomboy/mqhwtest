import type { CSSProperties } from "react";

import {
  FUNCTION_ROW,
  MAIN_ROWS,
  NAV_CLUSTER,
  NUMPAD,
} from "@/data/keyboardLayout";
import { KeyboardKey } from "@/components/keyboard/KeyboardKey";

interface KeyboardLayoutProps {
  pressed: Set<string>;
  tested: Set<string>;
}

/**
 * Grid tỉ lệ:  main (15u) | nav (3u) | numpad (4u)
 * Trên desktop container, mọi thứ tự fill 100% width.
 */
const CLUSTER_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "15fr 3fr 4fr",
  columnGap: "calc(var(--kb-u) * 0.5)",
  rowGap: "calc(var(--kb-u) * 0.15)",
};

export function KeyboardLayout({ pressed, tested }: KeyboardLayoutProps) {
  return (
    <div style={CLUSTER_GRID}>
      {/* Main area: function + 5 rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "calc(var(--kb-u) * 0.15)",
        }}
      >
        {/* Function row — grid 16 cols đều nhau */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
            gap: "calc(var(--kb-u) * 0.15)",
          }}
        >
          {FUNCTION_ROW.keys.map((k) => (
            <KeyboardKey
              key={k.code}
              keyDef={k}
              isPressed={pressed.has(k.code)}
              isTested={tested.has(k.code)}
              variant="function"
            />
          ))}
        </div>

        {/* 5 main rows — grid 60 cols (0.25u/cell) */}
        {MAIN_ROWS.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
              gap: "calc(var(--kb-u) * 0.15)",
            }}
          >
            {row.keys.map((k) => (
              <KeyboardKey
                key={k.code}
                keyDef={k}
                isPressed={pressed.has(k.code)}
                isTested={tested.has(k.code)}
                variant="main"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Nav cluster — grid 3×5, dời xuống để khớp hàng của main */}
      <div
        aria-label="Navigation cluster"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: `repeat(5, var(--kb-u))`,
          gap: "calc(var(--kb-u) * 0.15)",
          // Bù chiều cao function row (1u + gap)
          paddingTop: "calc(var(--kb-u) * 1.15)",
        }}
      >
        {NAV_CLUSTER.map((k) => (
          <KeyboardKey
            key={k.code}
            keyDef={k}
            isPressed={pressed.has(k.code)}
            isTested={tested.has(k.code)}
            variant="cluster"
          />
        ))}
      </div>

      {/* Numpad — grid 4×5 */}
      <div
        aria-label="Numeric keypad"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridTemplateRows: `repeat(5, var(--kb-u))`,
          gap: "calc(var(--kb-u) * 0.15)",
          paddingTop: "calc(var(--kb-u) * 1.15)",
        }}
      >
        {NUMPAD.map((k) => (
          <KeyboardKey
            key={k.code}
            keyDef={k}
            isPressed={pressed.has(k.code)}
            isTested={tested.has(k.code)}
            variant="cluster"
          />
        ))}
      </div>
    </div>
  );
}