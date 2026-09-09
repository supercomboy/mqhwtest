import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Maximize, Minimize, CheckCircle2, XCircle, ArrowLeft, ChevronLeft, ChevronRight, Eye, Grid, Sparkles } from 'lucide-react';
import { TestStatus, DisplayPattern } from '../types';

interface DisplayTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

interface PatternInfo {
  id: DisplayPattern;
  name: string;
  desc: string;
  bgStyle: string;
  type: 'solid' | 'gradient' | 'contrast' | 'brightness' | 'grid';
}

const PATTERNS: PatternInfo[] = [
  {
    id: 'black',
    name: 'Black Screen',
    desc: 'Check for bright pixels, stuck subpixels, and backlight bleed at screen edges.',
    bgStyle: '#000000',
    type: 'solid',
  },
  {
    id: 'white',
    name: 'White Screen',
    desc: 'Check for dead dark pixels, dirty screen effect (DSE), and color uniformity.',
    bgStyle: '#FFFFFF',
    type: 'solid',
  },
  {
    id: 'red',
    name: 'Red Screen',
    desc: 'Inspect red subpixel vitality and stuck green/blue pixels.',
    bgStyle: '#FF0000',
    type: 'solid',
  },
  {
    id: 'green',
    name: 'Green Screen',
    desc: 'Human eye is most sensitive to green. Look for dead pixels.',
    bgStyle: '#00FF00',
    type: 'solid',
  },
  {
    id: 'blue',
    name: 'Blue Screen',
    desc: 'Inspect blue subpixel integrity and color hue tinting.',
    bgStyle: '#0000FF',
    type: 'solid',
  },
  {
    id: 'gray',
    name: '50% Neutral Gray',
    desc: 'Best for spotting IPS glow, LCD vignetting, and banding.',
    bgStyle: '#808080',
    type: 'solid',
  },
  {
    id: 'gradient',
    name: 'RGB & Grayscale Gradient',
    desc: 'Test color depth rendering and 8-bit / 10-bit color banding.',
    bgStyle: 'gradient',
    type: 'gradient',
  },
  {
    id: 'contrast',
    name: 'Stepped Contrast Scale',
    desc: 'Verify monitor distinction between 0% to 100% luminance steps.',
    bgStyle: 'contrast',
    type: 'contrast',
  },
  {
    id: 'brightness',
    name: 'Shadow / Highlight Detail',
    desc: 'Check if near-black (1-5%) and near-white (95-99%) patches are distinguishable.',
    bgStyle: 'brightness',
    type: 'brightness',
  },
  {
    id: 'grid',
    name: 'Geometry & Pixel Alignment Grid',
    desc: 'Check image geometry, sharpness, and defective pixel lines.',
    bgStyle: 'grid',
    type: 'grid',
  },
];

export const DisplayTest: React.FC<DisplayTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testedPatterns, setTestedPatterns] = useState<Set<string>>(new Set(['black']));
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);

  const activePattern = PATTERNS[currentIndex];

  const nextPattern = () => {
    setCurrentIndex((prev) => {
      const nextIdx = (prev + 1) % PATTERNS.length;
      setTestedPatterns((old) => new Set(old).add(PATTERNS[nextIdx].id));
      return nextIdx;
    });
  };

  const prevPattern = () => {
    setCurrentIndex((prev) => {
      const prevIdx = (prev - 1 + PATTERNS.length) % PATTERNS.length;
      setTestedPatterns((old) => new Set(old).add(PATTERNS[prevIdx].id));
      return prevIdx;
    });
  };

  // Fullscreen trigger
  const toggleFullscreen = async () => {
    if (!fullscreenContainerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn('Fullscreen request failed', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation when in display test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextPattern();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPattern();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const markPass = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onStatusChange?.('passed', {
      patternsTested: testedPatterns.size,
      totalPatterns: PATTERNS.length,
      deadPixelsFound: 0,
      manuallyVerified: true,
    });
    if (onNext) onNext();
  };

  const markFail = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onStatusChange?.('failed', {
      patternsTested: testedPatterns.size,
      reportedDefect: 'Dead/Stuck/Bright pixel spotted by user',
    });
    if (onNext) onNext();
  };

  // Render pattern background graphics
  const renderPatternContent = () => {
    if (activePattern.type === 'solid') {
      return (
        <div
          className="w-full h-full flex items-center justify-center transition-colors duration-150"
          style={{ backgroundColor: activePattern.bgStyle }}
        />
      );
    }

    if (activePattern.type === 'gradient') {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 bg-gradient-to-r from-black via-white to-black" />
          <div className="flex-1 bg-gradient-to-r from-black via-red-600 to-white" />
          <div className="flex-1 bg-gradient-to-r from-black via-green-600 to-white" />
          <div className="flex-1 bg-gradient-to-r from-black via-blue-600 to-white" />
        </div>
      );
    }

    if (activePattern.type === 'contrast') {
      const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      return (
        <div className="w-full h-full flex flex-col justify-center bg-black p-4">
          <div className="flex h-32 w-full border border-slate-700">
            {steps.map((val) => (
              <div
                key={val}
                className="flex-1 flex flex-col items-center justify-end pb-2 font-mono text-[10px]"
                style={{
                  backgroundColor: `rgb(${Math.round((val / 100) * 255)}, ${Math.round(
                    (val / 100) * 255
                  )}, ${Math.round((val / 100) * 255)})`,
                  color: val > 50 ? '#000' : '#fff',
                }}
              >
                {val}%
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activePattern.type === 'brightness') {
      return (
        <div className="w-full h-full grid grid-cols-2">
          {/* Black shadow detail */}
          <div className="bg-black flex flex-col items-center justify-center gap-4 p-4">
            <span className="text-white text-xs font-mono">Shadow Step (1% - 5% Gray)</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className="w-12 h-12 flex items-center justify-center font-mono text-[9px] text-white/50 border border-slate-800"
                  style={{ backgroundColor: `rgb(${lvl * 3}, ${lvl * 3}, ${lvl * 3})` }}
                >
                  {lvl}%
                </div>
              ))}
            </div>
          </div>

          {/* White highlight detail */}
          <div className="bg-white flex flex-col items-center justify-center gap-4 p-4">
            <span className="text-black text-xs font-mono">Highlight Step (95% - 99% Gray)</span>
            <div className="flex gap-2">
              {[95, 96, 97, 98, 99].map((lvl) => (
                <div
                  key={lvl}
                  className="w-12 h-12 flex items-center justify-center font-mono text-[9px] text-black/50 border border-slate-300"
                  style={{
                    backgroundColor: `rgb(${Math.round((lvl / 100) * 255)}, ${Math.round(
                      (lvl / 100) * 255
                    )}, ${Math.round((lvl / 100) * 255)})`,
                  }}
                >
                  {lvl}%
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activePattern.type === 'grid') {
      return (
        <div
          className="w-full h-full bg-black flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          <div className="text-cyan-400 font-mono text-xs bg-slate-950/80 px-3 py-1 rounded border border-slate-700">
            Pixel Geometry & Line Test
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="display-back-btn"
              onClick={onBack}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Display & Pixel Diagnostics
              <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF]/20 text-[10px] font-bold text-[#00E5FF] font-mono border border-[#00E5FF]/30">
                PATTERN {currentIndex + 1} / {PATTERNS.length}
              </span>
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Dead pixel inspection, color uniformity, contrast step & backlight bleed
            </p>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          id="toggle-display-fullscreen-btn"
          onClick={toggleFullscreen}
          className="px-4 py-2 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] font-bold font-mono text-xs uppercase flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(0,229,255,0.4)]"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'FULLSCREEN TEST'}</span>
        </button>
      </div>

      {/* Main Pattern Stage */}
      <div
        ref={fullscreenContainerRef}
        id="display-stage-canvas"
        onClick={nextPattern}
        className={`relative bg-black rounded-lg overflow-hidden shadow-2xl border border-[#30363D] cursor-pointer select-none group transition-all ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : 'w-full aspect-[16/9] min-h-[380px]'
        }`}
      >
        {/* The Pattern Graphics */}
        {renderPatternContent()}

        {/* Floating Controls HUD (fades on idle or hover) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto opacity-90 group-hover:opacity-100 transition-opacity"
        >
          <div className="bg-[#0F1115]/90 backdrop-blur-md px-3 py-1.5 rounded border border-[#30363D] text-xs font-mono text-white flex items-center gap-2 shadow-lg">
            <span className="text-[#00E5FF] font-bold">{activePattern.name}</span>
            <span className="text-[#8892B0]">•</span>
            <span className="text-[11px] text-[#8892B0]">{activePattern.desc}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevPattern}
              className="p-1.5 rounded bg-[#0F1115]/90 hover:bg-[#21262D] border border-[#30363D] text-[#8892B0] hover:text-white text-xs shadow-lg"
              title="Previous pattern"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPattern}
              className="p-1.5 rounded bg-[#0F1115]/90 hover:bg-[#21262D] border border-[#30363D] text-[#8892B0] hover:text-white text-xs shadow-lg"
              title="Next pattern"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Hint Banner */}
        <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="bg-[#0F1115]/90 backdrop-blur-md px-3 py-1.5 rounded border border-[#30363D] text-[10px] text-[#8892B0] font-mono">
            Click screen or press <kbd className="px-1.5 py-0.5 bg-[#21262D] rounded text-[#00E5FF]">Space</kbd> / <kbd className="px-1.5 py-0.5 bg-[#21262D] rounded text-[#00E5FF]">Arrows</kbd> to cycle colors
          </div>

          {isFullscreen && (
            <div className="bg-[#0F1115]/90 backdrop-blur-md px-3 py-1.5 rounded border border-[#30363D] text-[10px] text-white font-mono">
              Press <kbd className="px-1.5 py-0.5 bg-[#21262D] rounded text-white">ESC</kbd> to exit fullscreen
            </div>
          )}
        </div>
      </div>

      {/* Pattern Thumbnails & Verdict Bar */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between font-mono">
          <span className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider">
            Diagnostic Color & Scale Index
          </span>
          <span className="text-[10px] font-mono text-[#00FF41]">
            {testedPatterns.size} / {PATTERNS.length} Tested
          </span>
        </div>

        {/* Pattern Pills */}
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setCurrentIndex(idx);
                setTestedPatterns((old) => new Set(old).add(p.id));
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono border flex items-center gap-2 transition-all ${
                currentIndex === idx
                  ? 'bg-[#00E5FF] text-[#0F1115] border-[#00E5FF] font-bold shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                  : testedPatterns.has(p.id)
                  ? 'bg-[#0D1117] border-[#238636] text-[#00FF41]'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8892B0] hover:text-white'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full border border-[#30363D]"
                style={{
                  backgroundColor: p.type === 'solid' ? p.bgStyle : '#777',
                }}
              />
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* User Verdict Question */}
        <div className="pt-3 border-t border-[#30363D] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8892B0]">
            <Eye className="w-4 h-4 text-[#00E5FF]" />
            <span>
              Observation: Did you detect any dead pixels, stuck subpixels, or irregular backlight glow?
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="display-pass-btn"
              onClick={markPass}
              className="py-2 px-4 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS (0 Defects)</span>
            </button>
            <button
              id="display-fail-btn"
              onClick={markFail}
              className="py-2 px-4 rounded bg-[#21262D] hover:bg-rose-950 hover:text-rose-400 text-[#8892B0] font-bold font-mono text-xs uppercase border border-[#30363D] transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>FAIL (Defect Detected)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
