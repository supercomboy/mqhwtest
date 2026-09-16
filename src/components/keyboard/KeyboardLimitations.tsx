import { Info } from "lucide-react";

export function KeyboardLimitations() {
  return (
    <div className="flex items-start gap-2 rounded border border-info/30 bg-info/5 p-2.5">
      <Info
        className="mt-0.5 h-3 w-3 shrink-0 text-info"
        aria-hidden="true"
      />
      <div className="space-y-0.5 text-[10px] text-muted-foreground">
        <p className="font-medium text-foreground">Browser limitations</p>
        <p>
          F1–F12 are now intercepted on this page. A few combinations are
          reserved by the browser or OS and cannot be captured by any web page:
        </p>
        <ul className="ml-3 list-disc space-y-0">
          <li>
            <span className="font-mono">Ctrl+W</span>,{" "}
            <span className="font-mono">Ctrl+T</span>,{" "}
            <span className="font-mono">Ctrl+N</span> — browser shortcuts
            (allowed through by design)
          </li>
          <li>
            <span className="font-mono">F11</span> — browser fullscreen
            (reserved)
          </li>
          <li>
            <span className="font-mono">F12</span> — developer tools (reserved)
          </li>
          <li>
            <span className="font-mono">Alt+Tab</span>,{" "}
            <span className="font-mono">Alt+F4</span> — operating system
          </li>
        </ul>
      </div>
    </div>
  );
}