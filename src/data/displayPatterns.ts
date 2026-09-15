export type DisplayStepKind =
  | "solid"
  | "rgb-gradient"
  | "grayscale"
  | "contrast"
  | "shadow"
  | "highlight"
  | "geometry"
  | "pixel-grid";

export interface DisplayStep {
  id: string;
  kind: DisplayStepKind;
  title: string;
  counter?: string;
  color?: string;
}

export const DISPLAY_STEPS: DisplayStep[] = [
  { id: "solid-black", kind: "solid", title: "Solid Colors — Black", counter: "1 / 8", color: "#000000" },
  { id: "solid-white", kind: "solid", title: "Solid Colors — White", counter: "2 / 8", color: "#FFFFFF" },
  { id: "solid-red", kind: "solid", title: "Solid Colors — Red", counter: "3 / 8", color: "#FF0000" },
  { id: "solid-green", kind: "solid", title: "Solid Colors — Green", counter: "4 / 8", color: "#00FF00" },
  { id: "solid-blue", kind: "solid", title: "Solid Colors — Blue", counter: "5 / 8", color: "#0000FF" },
  { id: "solid-yellow", kind: "solid", title: "Solid Colors — Yellow", counter: "6 / 8", color: "#FFFF00" },
  { id: "solid-cyan", kind: "solid", title: "Solid Colors — Cyan", counter: "7 / 8", color: "#00FFFF" },
  { id: "solid-magenta", kind: "solid", title: "Solid Colors — Magenta", counter: "8 / 8", color: "#FF00FF" },
  { id: "rgb-gradient", kind: "rgb-gradient", title: "RGB Gradient" },
  { id: "grayscale", kind: "grayscale", title: "Grayscale Gradient" },
  { id: "contrast", kind: "contrast", title: "Contrast Scale" },
  { id: "shadow", kind: "shadow", title: "Shadow Detail" },
  { id: "highlight", kind: "highlight", title: "Highlight Detail" },
  { id: "geometry", kind: "geometry", title: "Geometry & Alignment" },
  { id: "pixel-grid", kind: "pixel-grid", title: "Pixel Grid" },
];