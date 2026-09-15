import { Info } from "lucide-react";

export function KeyboardLimitations() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-info"
        aria-hidden="true"
      />
      <div className="space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Browser limitations</p>
        <p>
          Some key combinations are reserved by the operating system or the
          browser and cannot be captured by any web page. This includes:
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <span className="font-mono">Ctrl+W</span>,{" "}
            <span className="font-mono">Ctrl+T</span>,{" "}
            <span className="font-mono">Ctrl+N</span> — browser shortcuts
          </li>
          <li>
            <span className="font-mono">F5</span> — reloads the page
          </li>
          <li>
            <span className="font-mono">F11</span> — browser fullscreen
          </li>
          <li>
            <span className="font-mono">F12</span> — developer tools
          </li>
          <li>
            <span className="font-mono">Alt+Tab</span>,{" "}
            <span className="font-mono">Alt+F4</span> — operating system
          </li>
        </ul>
        <p>
          All other keys, including modifiers, function keys (F1–F12),
          navigation, and numpad, are captured normally.
        </p>
      </div>
    </div>
  );
}