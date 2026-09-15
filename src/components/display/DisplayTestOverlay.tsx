import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ControlsHiddenHint, DisplayController } from "@/components/display/DisplayController";
import { DisplayPattern } from "@/components/display/DisplayPatterns";
import { DISPLAY_STEPS } from "@/data/displayPatterns";
import { useFullscreen } from "@/hooks/useFullscreen";
import { cn } from "@/lib/utils";

const HIDE_DELAY_MS = 2500;

interface DisplayTestOverlayProps {
  onClose: (completed: boolean) => void;
}

export function DisplayTestOverlay({ onClose }: DisplayTestOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const hideTimerRef = useRef<number | null>(null);
  const wasFullscreenRef = useRef(false);
  const reachedLastStepRef = useRef(false);

  const { isFullscreen, exit } = useFullscreen();

  const step = DISPLAY_STEPS[stepIndex];
  const isLastStep = stepIndex === DISPLAY_STEPS.length - 1;

  /* ---------------- Auto-hide controls ---------------- */
  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const hideControlsNow = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setControlsVisible(false);
  }, []);

  /* Khởi động timer ẩn khi mount */
  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [scheduleHide]);

  /* ---------------- Navigation ---------------- */
  const goNext = useCallback(() => {
    setStepIndex((i) => {
      if (i >= DISPLAY_STEPS.length - 1) return i;
      const next = i + 1;
      if (next === DISPLAY_STEPS.length - 1) reachedLastStepRef.current = true;
      return next;
    });
    showControls();
  }, [showControls]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => (i <= 0 ? i : i - 1));
    showControls();
  }, [showControls]);

  /* ---------------- Fullscreen tracking ---------------- */
  useEffect(() => {
    if (isFullscreen) {
      wasFullscreenRef.current = true;
    } else if (wasFullscreenRef.current) {
      // Thoát fullscreen (do ESC hoặc programmatic) → đóng overlay
      onClose(reachedLastStepRef.current);
      wasFullscreenRef.current = false;
    }
  }, [isFullscreen, onClose]);

  /* ---------------- Keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        if (controlsVisible) hideControlsNow();
        else showControls();
      } else if (e.key === "Escape") {
        // Browser xử lý ESC → exit fullscreen → effect trên sẽ close overlay
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [goNext, goPrev, controlsVisible, hideControlsNow, showControls]);

  /* ---------------- Mouse activity ---------------- */
  useEffect(() => {
    const onActivity = () => {
      if (!controlsVisible) {
        setControlsVisible(true);
      }
      scheduleHide();
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [controlsVisible, scheduleHide]);

  /* ---------------- Handlers ---------------- */
  const handleExit = useCallback(() => {
    exit();
    // Nếu fullscreen không active (fallback), đóng trực tiếp
    if (!document.fullscreenElement) {
      onClose(reachedLastStepRef.current);
    }
  }, [exit, onClose]);

  const handleDone = useCallback(() => {
    reachedLastStepRef.current = true;
    exit();
    if (!document.fullscreenElement) {
      onClose(true);
    }
  }, [exit, onClose]);

  const handleClickPattern = useCallback(() => {
    if (controlsVisible) {
      // Đang hiện → click chuyển next
      if (!isLastStep) goNext();
      else handleDone();
    } else {
      // Đang ẩn → click hiện controls
      showControls();
    }
  }, [controlsVisible, isLastStep, goNext, handleDone, showControls]);

  /* ---------------- Render ---------------- */
  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-black select-none",
        !controlsVisible && "cursor-none",
      )}
      onClick={handleClickPattern}
      role="presentation"
    >
      {/* Pattern layer */}
      <DisplayPattern step={step} />

      {/* Controller */}
      {controlsVisible ? (
        <DisplayController
          visible
          stepIndex={stepIndex}
          total={DISPLAY_STEPS.length}
          title={step.title}
          counter={step.counter}
          onPrev={goPrev}
          onNext={isLastStep ? handleDone : goNext}
          onHide={hideControlsNow}
          onExit={handleExit}
        />
      ) : (
        <ControlsHiddenHint />
      )}

      {/* Bottom-right shortcut hint, chỉ hiện cùng controls */}
      {controlsVisible && (
        <div className="pointer-events-none absolute right-6 top-6 rounded-md border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/70">
            ← → / Space to navigate · H to hide · ESC to exit
          </p>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}