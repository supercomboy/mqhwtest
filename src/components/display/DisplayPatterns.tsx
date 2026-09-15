import type { DisplayStep } from "@/data/displayPatterns";

const SHADOW_STEPS = [2, 4, 6, 8, 10, 12, 14, 16];
const HIGHLIGHT_STEPS = [255, 254, 253, 252, 251, 250, 249, 248];

export function DisplayPattern({ step }: { step: DisplayStep }) {
  switch (step.kind) {
    case "solid":
      return <SolidPattern color={step.color ?? "#000000"} />;
    case "rgb-gradient":
      return <RgbGradientPattern />;
    case "grayscale":
      return <GrayscalePattern />;
    case "contrast":
      return <ContrastPattern />;
    case "shadow":
      return <ShadowPattern />;
    case "highlight":
      return <HighlightPattern />;
    case "geometry":
      return <GeometryPattern />;
    case "pixel-grid":
      return <PixelGridPattern />;
  }
}

/* ---------- 1. Solid ---------- */
function SolidPattern({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{ background: color }}
      aria-label={`Solid ${color}`}
    />
  );
}

/* ---------- 2. RGB Gradient ---------- */
function RgbGradientPattern() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        className="flex-1"
        style={{ background: "linear-gradient(90deg, #000 0%, #f00 100%)" }}
      />
      <div
        className="flex-1"
        style={{ background: "linear-gradient(90deg, #000 0%, #0f0 100%)" }}
      />
      <div
        className="flex-1"
        style={{ background: "linear-gradient(90deg, #000 0%, #00f 100%)" }}
      />
    </div>
  );
}

/* ---------- 3. Grayscale ---------- */
function GrayscalePattern() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(90deg, #000 0%, #fff 100%)",
      }}
    />
  );
}

/* ---------- 4. Contrast Scale ---------- */
function ContrastPattern() {
  const steps = Array.from({ length: 11 }, (_, i) =>
    Math.round((255 * i) / 10),
  );
  return (
    <div className="absolute inset-0 flex">
      {steps.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ background: `rgb(${v}, ${v}, ${v})` }}
        />
      ))}
    </div>
  );
}

/* ---------- 5. Shadow Detail ---------- */
function ShadowPattern() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[1.5vw] bg-black">
      {SHADOW_STEPS.map((v) => (
        <div
          key={v}
          className="h-[20vh] w-[8vw]"
          style={{ background: `rgb(${v}, ${v}, ${v})` }}
        />
      ))}
    </div>
  );
}

/* ---------- 6. Highlight Detail ---------- */
function HighlightPattern() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[1.5vw] bg-white">
      {HIGHLIGHT_STEPS.map((v) => (
        <div
          key={v}
          className="h-[20vh] w-[8vw]"
          style={{ background: `rgb(${v}, ${v}, ${v})` }}
        />
      ))}
    </div>
  );
}

/* ---------- 7. Geometry ---------- */
function GeometryPattern() {
  return (
    <div className="absolute inset-0 bg-black">
      {/* Grid 5% */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "5% 5%",
        }}
      />

      {/* Circles */}
      <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
      <div className="absolute left-1/2 top-1/2 h-[50vmin] w-[50vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
      <div className="absolute left-1/2 top-1/2 h-[30vmin] w-[30vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
      <div className="absolute left-1/2 top-1/2 h-[10vmin] w-[10vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 h-[80vh] w-px -translate-x-1/2 -translate-y-1/2 bg-white/60" />
      <div className="absolute left-1/2 top-1/2 h-px w-[80vw] -translate-x-1/2 -translate-y-1/2 bg-white/60" />

      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />

      {/* Corner markers */}
      <div className="absolute left-[2vw] top-[2vh] h-[6vh] w-[6vh] border border-white/70" />
      <div className="absolute right-[2vw] top-[2vh] h-[6vh] w-[6vh] border border-white/70" />
      <div className="absolute bottom-[2vh] left-[2vw] h-[6vh] w-[6vh] border border-white/70" />
      <div className="absolute bottom-[2vh] right-[2vw] h-[6vh] w-[6vh] border border-white/70" />
    </div>
  );
}

/* ---------- 8. Pixel Grid ---------- */
function PixelGridPattern() {
  const bands = [
    { bg: "#FF0000", line: "rgba(0,0,0,0.18)" },
    { bg: "#00FF00", line: "rgba(0,0,0,0.18)" },
    { bg: "#0000FF", line: "rgba(255,255,255,0.18)" },
    { bg: "#FFFFFF", line: "rgba(0,0,0,0.14)" },
    { bg: "#000000", line: "rgba(255,255,255,0.14)" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col">
      {bands.map((b, i) => (
        <div
          key={i}
          className="relative flex-1"
          style={{ background: b.bg }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, ${b.line} 1px, transparent 1px),
                linear-gradient(to bottom, ${b.line} 1px, transparent 1px)
              `,
              backgroundSize: "8px 8px",
            }}
          />
        </div>
      ))}
    </div>
  );
}