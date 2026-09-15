import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DisplayControllerProps {
  visible: boolean;
  stepIndex: number;
  total: number;
  title: string;
  counter?: string;
  onPrev: () => void;
  onNext: () => void;
  onHide: () => void;
  onExit: () => void;
}

export function DisplayController({
  visible,
  stepIndex,
  total,
  title,
  counter,
  onPrev,
  onNext,
  onHide,
  onExit,
}: DisplayControllerProps) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-lg border border-white/15 bg-black/70 px-3 py-2 backdrop-blur-md",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Previous pattern"
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-[220px] text-center">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/60">
            Test {stepIndex + 1} / {total}
          </p>
          <p className="truncate text-sm font-medium text-white">
            {title}
            {counter && (
              <span className="ml-2 font-mono text-xs text-white/60">
                {counter}
              </span>
            )}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={isLast}
          aria-label="Next pattern"
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="mx-1 h-6 w-px bg-white/20" aria-hidden="true" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onHide}
          aria-label="Hide controls (H)"
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <EyeOff className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          aria-label="Exit fullscreen test (ESC)"
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Exit
        </Button>
      </div>
    </div>
  );
}

/** Nhắc nhở nhỏ khi controls ẩn — hiển thị 1 lần ở giữa dưới. */
export function ControlsHiddenHint() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur-md">
        <Eye className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
          Move mouse or press H to show controls
        </span>
      </div>
    </div>
  );
}