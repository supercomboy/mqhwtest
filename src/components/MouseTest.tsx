import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Move, Disc } from 'lucide-react';
import { TestStatus } from '../types';

interface MouseTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

export const MouseTest: React.FC<MouseTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [leftClickActive, setLeftClickActive] = useState(false);
  const [rightClickActive, setRightClickActive] = useState(false);
  const [middleClickActive, setMiddleClickActive] = useState(false);

  const [leftTested, setLeftTested] = useState(false);
  const [rightTested, setRightTested] = useState(false);
  const [middleTested, setMiddleTested] = useState(false);

  const [leftCount, setLeftCount] = useState(0);
  const [rightCount, setRightCount] = useState(0);
  const [middleCount, setMiddleCount] = useState(0);

  const [wheelUpCount, setWheelUpCount] = useState(0);
  const [wheelDownCount, setWheelDownCount] = useState(0);
  const [wheelDirection, setWheelDirection] = useState<'up' | 'down' | null>(null);

  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [distance, setDistance] = useState(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Handle Mouse Down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      setLeftClickActive(true);
      setLeftTested(true);
      setLeftCount((c) => c + 1);
    } else if (e.button === 1) {
      setMiddleClickActive(true);
      setMiddleTested(true);
      setMiddleCount((c) => c + 1);
    } else if (e.button === 2) {
      setRightClickActive(true);
      setRightTested(true);
      setRightCount((c) => c + 1);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) setLeftClickActive(false);
    if (e.button === 1) setMiddleClickActive(false);
    if (e.button === 2) setRightClickActive(false);
  }, []);

  // Handle Wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setWheelUpCount((c) => c + 1);
      setWheelDirection('up');
    } else if (e.deltaY > 0) {
      setWheelDownCount((c) => c + 1);
      setWheelDirection('down');
    }
  }, []);

  // Handle Mouse Move inside canvas / test area
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    setPosX(x);
    setPosY(y);

    if (lastPosRef.current) {
      const dx = x - lastPosRef.current.x;
      const dy = y - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setDistance((d) => Math.round(d + dist));
    }
    lastPosRef.current = { x, y };

    // Draw trail on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.fill();

        // Optional connecting line
        if (lastPosRef.current) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    }
  }, []);

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setPosX(0);
    setPosY(0);
    setDistance(0);
    lastPosRef.current = null;
  };

  // Reset entire mouse test
  const handleReset = () => {
    setLeftTested(false);
    setRightTested(false);
    setMiddleTested(false);
    setLeftCount(0);
    setRightCount(0);
    setMiddleCount(0);
    setWheelUpCount(0);
    setWheelDownCount(0);
    setWheelDirection(null);
    clearCanvas();
    onStatusChange?.('testing');
  };

  // Check overall status
  useEffect(() => {
    const clickPassed = leftTested && rightTested && middleTested;
    const wheelPassed = wheelUpCount > 0 && wheelDownCount > 0;
    const movePassed = distance > 200;

    if (clickPassed && wheelPassed && movePassed) {
      onStatusChange?.('passed', {
        leftClicks: leftCount,
        rightClicks: rightCount,
        middleClicks: middleCount,
        wheelUp: wheelUpCount,
        wheelDown: wheelDownCount,
        distanceTraveled: distance,
      });
    } else if (leftTested || rightTested || middleTested || distance > 0) {
      onStatusChange?.('testing');
    }
  }, [
    leftTested,
    rightTested,
    middleTested,
    wheelUpCount,
    wheelDownCount,
    distance,
    leftCount,
    rightCount,
    middleCount,
    onStatusChange,
  ]);

  const markPass = () => {
    onStatusChange?.('passed', {
      leftClicks: leftCount,
      rightClicks: rightCount,
      middleClicks: middleCount,
      wheelUp: wheelUpCount,
      wheelDown: wheelDownCount,
      distanceTraveled: distance,
      manuallyVerified: true,
    });
    if (onNext) onNext();
  };

  const markFail = () => {
    onStatusChange?.('failed', {
      leftClicks: leftCount,
      rightClicks: rightCount,
      middleClicks: middleCount,
    });
    if (onNext) onNext();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header matching Sleek Interface */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="mouse-back-btn"
              onClick={onBack}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <MousePointer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Mouse & Pointer Diagnostics
              {(leftTested || rightTested || middleTested) && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#238636] text-[10px] font-bold text-white font-mono shadow-[0_0_8px_rgba(46,160,67,0.4)]">
                  ACTIVE
                </span>
              )}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Switch debounce, scroll wheel encoder & cursor polling rate
            </p>
          </div>
        </div>

        <button
          id="mouse-reset-btn"
          onClick={handleReset}
          className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] text-xs font-mono uppercase transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Column: Visual Mouse Graphic with Click Indicators */}
        <div
          id="mouse-test-interact-zone"
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="md:col-span-5 bg-[#161B22] border border-[#2D333B] rounded-lg p-6 flex flex-col items-center justify-between select-none relative overflow-hidden group cursor-crosshair"
        >
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0] font-bold">
              Physical Mouse Tester
            </span>
            <span className="text-[10px] font-mono text-[#00E5FF]">3-BUTTON OPTICAL</span>
          </div>

          {/* Sleek Mouse Diagram */}
          <div className="relative w-52 h-80 bg-[#0D1117] border border-[#30363D] rounded-[50px_50px_60px_60px] shadow-2xl p-3 flex flex-col items-center">
            {/* Top Buttons Row */}
            <div className="w-full flex gap-2 h-36 relative">
              {/* Left Button */}
              <div
                id="mouse-left-btn-indicator"
                className={`flex-1 rounded-[38px_10px_6px_6px] border flex flex-col items-center justify-center p-2 transition-all font-mono ${
                  leftClickActive
                    ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] scale-95 shadow-[0_0_12px_rgba(0,229,255,0.6)] font-bold'
                    : leftTested
                    ? 'bg-[#238636] border-[#2EA043] text-white shadow-[0_0_8px_rgba(46,160,67,0.4)]'
                    : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wider">LEFT</span>
                <span className="text-base font-bold mt-1">
                  {leftTested ? 'PASS' : '—'}
                </span>
                <span className="text-[10px] text-white/70 mt-1">{leftCount} clicks</span>
              </div>

              {/* Scroll Wheel / Middle Button */}
              <div
                id="mouse-middle-btn-indicator"
                className={`w-12 rounded border flex flex-col items-center justify-center py-2 transition-all font-mono ${
                  middleClickActive
                    ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] scale-95 shadow-[0_0_12px_rgba(0,229,255,0.6)] font-bold'
                    : middleTested
                    ? 'bg-[#238636] border-[#2EA043] text-white shadow-[0_0_8px_rgba(46,160,67,0.4)]'
                    : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                }`}
              >
                <div
                  className={`w-3.5 h-10 rounded-full border border-[#30363D] flex items-center justify-center transition-transform ${
                    wheelDirection === 'up' ? '-translate-y-1 bg-[#00E5FF]' : wheelDirection === 'down' ? 'translate-y-1 bg-[#00E5FF]' : 'bg-[#0D1117]'
                  }`}
                >
                  <Disc className="w-2.5 h-2.5 text-[#8892B0]" />
                </div>
                <span className="text-[8px] font-bold mt-1">MID</span>
                <span className="text-[9px]">{middleCount}</span>
              </div>

              {/* Right Button */}
              <div
                id="mouse-right-btn-indicator"
                className={`flex-1 rounded-[10px_38px_6px_6px] border flex flex-col items-center justify-center p-2 transition-all font-mono ${
                  rightClickActive
                    ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] scale-95 shadow-[0_0_12px_rgba(0,229,255,0.6)] font-bold'
                    : rightTested
                    ? 'bg-[#238636] border-[#2EA043] text-white shadow-[0_0_8px_rgba(46,160,67,0.4)]'
                    : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                }`}
              >
                <span className="text-[10px] font-bold tracking-wider">RIGHT</span>
                <span className="text-base font-bold mt-1">
                  {rightTested ? 'PASS' : '—'}
                </span>
                <span className="text-[10px] text-white/70 mt-1">{rightCount} clicks</span>
              </div>
            </div>

            {/* Mouse Palm Rest */}
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <span className="text-[9px] font-mono tracking-widest text-[#8892B0]">OPTICAL SENSOR</span>
              <div className="w-6 h-6 rounded-full border border-[#30363D] flex items-center justify-center mt-2">
                <div className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              </div>
            </div>
          </div>

          <p className="text-[10px] font-mono text-[#8892B0] mt-4 text-center">
            Click Left, Right, & Wheel inside card to test switch response
          </p>
        </div>

        {/* Right Column: MOVE MOUSE HERE Canvas & Wheel / Motion Metrics */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Movement & Wheel Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded">
              <span className="text-[10px] text-[#8892B0] uppercase block font-mono">
                Coordinates (X/Y)
              </span>
              <div className="font-mono text-sm font-bold text-white mt-1">
                X: <span className="text-[#00E5FF]">{posX}</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                Y: <span className="text-[#00E5FF]">{posY}</span>
              </div>
            </div>

            <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded">
              <span className="text-[10px] text-[#8892B0] uppercase block font-mono">Wheel Encoder</span>
              <div className="flex items-center gap-3 mt-1 font-mono text-sm">
                <span className="text-[#00FF41] font-bold">↑ {wheelUpCount}</span>
                <span className="text-[#00E5FF] font-bold">↓ {wheelDownCount}</span>
              </div>
              <span className="text-[10px] font-mono text-[#8892B0]">
                {wheelDirection ? `Rolling ${wheelDirection}` : 'Scroll anywhere'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#0D1117] border border-[#30363D] p-3.5 rounded">
              <span className="text-[10px] text-[#8892B0] uppercase block font-mono">Total Traveled</span>
              <div className="font-mono text-lg font-bold text-white mt-1">
                {distance} <span className="text-xs font-normal text-[#8892B0]">px</span>
              </div>
              <span className="text-[10px] font-mono text-[#00FF41]">
                {distance > 200 ? '✓ Smooth polling' : 'Move across box'}
              </span>
            </div>
          </div>

          {/* MOVE MOUSE HERE Zone */}
          <div
            id="mouse-move-canvas-container"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            className="flex-1 min-h-[260px] bg-[#0D1117] border border-[#30363D] rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors cursor-crosshair"
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            <div className="text-center pointer-events-none z-10 space-y-1">
              <div className="inline-flex p-3 rounded-full bg-[#161B22] border border-[#30363D] text-[#00E5FF] mb-2">
                <MousePointer className="w-5 h-5 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide font-mono">
                MOVE MOUSE HERE
              </h3>
              <p className="text-xs text-[#8892B0] max-w-xs mx-auto font-mono">
                Glide your cursor inside this trackpad to test sensor tracking, smooth interpolation, and click events.
              </p>
            </div>

            <button
              id="clear-trail-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearCanvas();
              }}
              className="absolute bottom-3 right-3 text-[10px] font-mono px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors z-20"
            >
              Clear Trail
            </button>
          </div>

          {/* Pass / Fail Action Buttons */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="text-xs font-mono text-[#8892B0]">
              Buttons tested:{' '}
              <span className="font-bold text-white">
                {leftTested && rightTested && middleTested ? 'All Passed (3/3)' : `${[leftTested, rightTested, middleTested].filter(Boolean).length}/3`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="mouse-pass-btn"
                onClick={markPass}
                className="py-2 px-4 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PASS</span>
              </button>
              <button
                id="mouse-fail-btn"
                onClick={markFail}
                className="py-2 px-3 rounded bg-[#21262D] hover:bg-rose-950 hover:text-rose-400 text-[#8892B0] font-bold font-mono text-xs uppercase border border-[#30363D] transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>FAIL</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
