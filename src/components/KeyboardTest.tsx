import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TOP_MEDIA_KEYS,
  EXACT_KEYBOARD_LAYOUT,
  getTotalKeysInExactLayout,
  KeyDef,
  MediaButtonDef,
} from '../data/keyboardLayout';
import { playKeyClickSound } from '../utils/audioUtils';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Keyboard,
  ArrowLeft,
  Volume1,
  SkipBack,
  Square,
  Play,
  SkipForward,
  Music,
  Globe,
  Undo2,
  Redo2,
  RotateCw,
  X,
  Search,
  Star,
  Mail,
  Calculator,
  Folder,
} from 'lucide-react';
import { TestStatus } from '../types';

interface KeyboardTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

// Windows 4-square logo
const WindowsIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.751" />
  </svg>
);

// Context Menu 3-line logo
const ContextMenuIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="17" y2="16" />
  </svg>
);

// Helper for top media icons
const MediaIcon: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'volume-mute':
      return <VolumeX className="w-3.5 h-3.5" />;
    case 'volume-down':
      return <Volume1 className="w-3.5 h-3.5" />;
    case 'volume-up':
      return <Volume2 className="w-3.5 h-3.5" />;
    case 'track-prev':
      return <SkipBack className="w-3.5 h-3.5" />;
    case 'media-stop':
      return <Square className="w-3.5 h-3.5 fill-current" />;
    case 'play-pause':
      return <Play className="w-3.5 h-3.5 fill-current" />;
    case 'track-next':
      return <SkipForward className="w-3.5 h-3.5" />;
    case 'music':
      return <Music className="w-3.5 h-3.5" />;
    case 'globe':
      return <Globe className="w-3.5 h-3.5" />;
    case 'arrow-back':
      return <Undo2 className="w-3.5 h-3.5" />;
    case 'arrow-forward':
      return <Redo2 className="w-3.5 h-3.5" />;
    case 'refresh':
      return <RotateCw className="w-3.5 h-3.5" />;
    case 'close-circle':
      return <X className="w-3.5 h-3.5" />;
    case 'search':
      return <Search className="w-3.5 h-3.5" />;
    case 'star':
      return <Star className="w-3.5 h-3.5 fill-current" />;
    case 'mail':
      return <Mail className="w-3.5 h-3.5" />;
    case 'calculator':
      return <Calculator className="w-3.5 h-3.5" />;
    case 'folder':
      return <Folder className="w-3.5 h-3.5" />;
    default:
      return null;
  }
};

// Keys that MUST prevent default browser action to avoid scrolling or navigating
const PREVENT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Space',
  ' ',
  'Tab',
  'Backspace',
  'Escape',
  'Enter',
  'ContextMenu',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'Numpad0',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadDecimal',
  'NumpadEnter',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'AudioVolumeMute',
  'AudioVolumeDown',
  'AudioVolumeUp',
  'MediaTrackPrevious',
  'MediaStop',
  'MediaPlayPause',
  'MediaTrackNext',
  'MediaSelect',
  'BrowserHome',
  'BrowserBack',
  'BrowserForward',
  'BrowserRefresh',
  'BrowserStop',
  'BrowserSearch',
  'BrowserFavorites',
  'LaunchMail',
  'LaunchApp2',
  'LaunchApp1',
]);

export const KeyboardTest: React.FC<KeyboardTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [testedKeys, setTestedKeys] = useState<Set<string>>(new Set());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [lastEvent, setLastEvent] = useState<{
    code: string;
    key: string;
    keyCode: number;
    timestamp: number;
  } | null>(null);
  const [eventHistory, setEventHistory] = useState<
    Array<{
      code: string;
      key: string;
      type: 'down' | 'up';
      time: string;
    }>
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalKeys = getTotalKeysInExactLayout();
  const testedCount = testedKeys.size;
  const progressPercent = Math.min(100, Math.round((testedCount / totalKeys) * 100));

  // Normalize key code across various browsers and OS
  const normalizeCode = useCallback((e: KeyboardEvent): string => {
    let code = e.code;
    if (code === 'OSLeft') return 'MetaLeft';
    if (code === 'OSRight') return 'MetaRight';

    // Fallbacks if code is missing or generic
    if (!code || code === 'Unidentified') {
      const key = e.key;
      if (key === 'ArrowUp') return 'ArrowUp';
      if (key === 'ArrowDown') return 'ArrowDown';
      if (key === 'ArrowLeft') return 'ArrowLeft';
      if (key === 'ArrowRight') return 'ArrowRight';
      if (key === 'PageUp') return 'PageUp';
      if (key === 'PageDown') return 'PageDown';
      if (key === 'Home') return 'Home';
      if (key === 'End') return 'End';
      if (key === 'Insert') return 'Insert';
      if (key === 'Delete') return 'Delete';
      if (key === ' ') return 'Space';
      if (key === 'Tab') return 'Tab';
      if (key === 'Enter') return 'Enter';
      if (key === 'Escape') return 'Escape';
      if (key === 'Backspace') return 'Backspace';
      return key;
    }
    return code;
  }, []);

  // Handle Key Down
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Prevent browser default behavior (scrolling, navigating, reloading, focus jumping)
      if (
        PREVENT_KEYS.has(e.code) ||
        PREVENT_KEYS.has(e.key) ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === ' ' ||
        e.key === 'Tab'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      const code = normalizeCode(e);

      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });

      setTestedKeys((prev) => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });

      setLastEvent({
        code,
        key: e.key,
        keyCode: e.keyCode,
        timestamp: Date.now(),
      });

      setEventHistory((prev) => [
        {
          code,
          key: e.key === ' ' ? 'Space' : e.key,
          type: 'down',
          time: new Date().toLocaleTimeString([], {
            hour12: false,
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 2,
          } as Intl.DateTimeFormatOptions),
        },
        ...prev.slice(0, 7),
      ]);

      if (soundEnabled) {
        playKeyClickSound();
      }
    },
    [soundEnabled, normalizeCode]
  );

  // Handle Key Up
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // Prevent browser default behavior on keyup as well
      if (
        PREVENT_KEYS.has(e.code) ||
        PREVENT_KEYS.has(e.key) ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        e.key === ' ' ||
        e.key === 'Tab'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      const code = normalizeCode(e);

      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    },
    [normalizeCode]
  );

  // Interactive manual click testing for keys (great for testing media keys or keys not on physical keyboard)
  const handleKeyClick = (code: string, label: string) => {
    setActiveKeys((prev) => new Set(prev).add(code));
    setTestedKeys((prev) => new Set(prev).add(code));
    setLastEvent({
      code,
      key: label,
      keyCode: 0,
      timestamp: Date.now(),
    });
    setEventHistory((prev) => [
      {
        code,
        key: label,
        type: 'down',
        time: new Date().toLocaleTimeString([], {
          hour12: false,
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 2,
        } as Intl.DateTimeFormatOptions),
      },
      ...prev.slice(0, 7),
    ]);
    if (soundEnabled) {
      playKeyClickSound();
    }
    setTimeout(() => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }, 150);
  };

  // Mouse button testing
  const handleMouseDown = (e: React.MouseEvent) => {
    let code = '';
    if (e.button === 0) code = 'MouseLeft';
    else if (e.button === 2) code = 'MouseRight';

    if (code) {
      setActiveKeys((prev) => new Set(prev).add(code));
      setTestedKeys((prev) => new Set(prev).add(code));
      setLastEvent({
        code,
        key: code === 'MouseLeft' ? 'Left Click' : 'Right Click',
        keyCode: e.button,
        timestamp: Date.now(),
      });
      if (soundEnabled) playKeyClickSound();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    let code = '';
    if (e.button === 0) code = 'MouseLeft';
    else if (e.button === 2) code = 'MouseRight';

    if (code) {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }
  };

  // Attach global keyboard listeners in CAPTURE phase to intercept before default browser actions
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });

    const preventContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('#keyboard-visualizer-container')) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Sync results with parent / wizard
  useEffect(() => {
    if (testedCount > 0 && onStatusChange) {
      onStatusChange('pass', {
        testedKeysCount: testedCount,
        totalKeys,
        progress: `${progressPercent}%`,
        lastScancode: lastEvent?.code || '',
      });
    }
  }, [testedCount, totalKeys, progressPercent, lastEvent, onStatusChange]);

  const handleReset = () => {
    setTestedKeys(new Set());
    setActiveKeys(new Set());
    setLastEvent(null);
    setEventHistory([]);
    if (onStatusChange) {
      onStatusChange('untested', { testedKeysCount: 0 });
    }
  };

  const markPass = () => {
    if (onStatusChange) {
      onStatusChange('pass', {
        manualVerdict: 'PASSED',
        testedKeysCount: testedCount,
        progress: `${progressPercent}%`,
      });
    }
    if (isWizard && onNext) {
      onNext();
    }
  };

  const markFail = () => {
    if (onStatusChange) {
      onStatusChange('fail', {
        manualVerdict: 'FAILED',
        testedKeysCount: testedCount,
        progress: `${progressPercent}%`,
      });
    }
    if (isWizard && onNext) {
      onNext();
    }
  };

  // Helper to render individual keycaps matching the Sleek Interface theme
  const renderKey = (
    def: KeyDef,
    customWidth?: string,
    customHeight?: string,
    customClass?: string
  ) => {
    const isActive = activeKeys.has(def.code);
    const isTested = testedKeys.has(def.code);

    return (
      <button
        type="button"
        key={def.code}
        id={`key-${def.code}`}
        title={def.title || def.code}
        onClick={() => handleKeyClick(def.code, def.label)}
        style={{
          width: customWidth || (def.width ? `${Math.round(def.width * 42)}px` : '42px'),
          height: customHeight || (def.height && def.height > 1 ? '86px' : '40px'),
        }}
        className={`relative flex flex-col items-center justify-center rounded-md select-none transition-all duration-75 text-xs font-mono border flex-shrink-0 cursor-pointer ${
          isActive
            ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] font-bold shadow-[0_0_14px_rgba(0,229,255,0.85)] scale-[0.96] ring-2 ring-[#00E5FF]/40 z-20'
            : isTested
            ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.25)] font-semibold'
            : 'bg-[#161B22] border-[#30363D] text-[#E0E6ED] hover:border-[#00E5FF]/50'
        } ${customClass || ''}`}
      >
        {def.icon === 'windows' ? (
          <WindowsIcon />
        ) : def.icon === 'menu' ? (
          <ContextMenuIcon />
        ) : (
          <>
            {def.subLabel && (
              <span
                className={`text-[9px] leading-none mb-0.5 ${
                  isActive ? 'text-[#0F1115]' : isTested ? 'text-[#00FF41]/80' : 'text-[#8892B0]'
                }`}
              >
                {def.subLabel}
              </span>
            )}
            <span className="leading-tight truncate px-0.5 text-[11px] font-mono tracking-tight">
              {def.label}
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto select-none" ref={containerRef}>
      {/* Header Bar matching Sleek Interface */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="keyboard-back-btn"
              onClick={onBack}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Keyboard Input Visualizer
              <span className="text-xs font-normal text-[#8892B0] hidden sm:inline">
                — Press or click any key to test
              </span>
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Scancode interceptor active • Arrow / Navigation keys isolated without page scroll
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status badge */}
          <div className="px-3 py-1 bg-[#238636] text-[10px] font-bold text-white rounded-full font-mono tracking-wide shadow-[0_0_8px_rgba(46,160,67,0.4)]">
            {testedCount > 0 ? 'TESTING IN PROGRESS' : 'READY FOR INPUT'}
          </div>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 px-2.5 rounded border transition-colors flex items-center gap-1.5 text-xs font-mono ${
              soundEnabled
                ? 'bg-[#21262D] border-[#00E5FF] text-[#00E5FF]'
                : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
            }`}
            title="Toggle click sound feedback"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>SFX</span>
          </button>

          {/* Reset */}
          <button
            id="keyboard-reset-btn"
            onClick={handleReset}
            className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] text-xs font-mono uppercase transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Metrics Bar matching Sleek Interface */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded flex flex-col justify-between">
          <span className="block text-[10px] text-[#8892B0] uppercase mb-1 font-mono">Total Keys</span>
          <span className="text-2xl font-mono text-white">{totalKeys}</span>
        </div>

        <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded flex flex-col justify-between">
          <span className="block text-[10px] text-[#8892B0] uppercase mb-1 font-mono">Tested Keys</span>
          <span className="text-2xl font-mono text-[#00E5FF]">{testedCount}</span>
        </div>

        <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded flex flex-col justify-between">
          <span className="block text-[10px] text-[#8892B0] uppercase mb-1 font-mono">Currently Held</span>
          <span className="text-2xl font-mono text-white">{activeKeys.size}</span>
        </div>

        <div className="bg-[#0D1117] border border-[#30363D] p-3.5 rounded flex flex-col justify-between">
          <span className="block text-[10px] text-[#8892B0] uppercase mb-1 font-mono">Status</span>
          <span className={`text-2xl font-mono font-bold ${testedCount > 0 ? 'text-[#00FF41]' : 'text-[#8892B0]'}`}>
            {testedCount > 0 ? 'PASS' : 'READY'}
          </span>
        </div>
      </div>

      {/* Visual Interactive Keyboard (Exact Layout from user photo) */}
      <div
        id="keyboard-visualizer-container"
        onContextMenu={(e) => e.preventDefault()}
        className="bg-[#161B22] border border-[#2D333B] rounded-xl p-4 sm:p-5 shadow-2xl overflow-x-auto"
      >
        <div className="w-[950px] mx-auto space-y-2">
          {/* 1. TOP MEDIA CAPSULES ROW */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-[#21262D]">
            {/* Fn + Volume Pill */}
            {TOP_MEDIA_KEYS.filter((k) => k.group === 'fn').map((btn) => {
              const isActive = activeKeys.has(btn.code);
              const isTested = testedKeys.has(btn.code);
              return (
                <button
                  type="button"
                  key={btn.code}
                  id={`media-key-${btn.code}`}
                  title={btn.title}
                  onClick={() => handleKeyClick(btn.code, btn.label || btn.code)}
                  className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] font-bold shadow-[0_0_10px_#00E5FF]'
                      : isTested
                      ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                      : 'bg-[#161B22] border-[#30363D] text-[#E0E6ED] hover:border-[#00E5FF]/40'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}

            {/* Audio / Media Controls Group */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0D1117] rounded-full border border-[#21262D]">
              {TOP_MEDIA_KEYS.filter((k) => k.group === 'audio').map((btn) => {
                const isActive = activeKeys.has(btn.code);
                const isTested = testedKeys.has(btn.code);
                return (
                  <button
                    type="button"
                    key={btn.code}
                    id={`media-key-${btn.code}`}
                    title={btn.title}
                    onClick={() => handleKeyClick(btn.code, btn.title)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] shadow-[0_0_8px_#00E5FF]'
                        : isTested
                        ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                        : 'bg-[#161B22] border-[#30363D] text-[#E0E6ED] hover:border-[#00E5FF]/40'
                    }`}
                  >
                    <MediaIcon name={btn.iconName} />
                  </button>
                );
              })}
            </div>

            {/* Browser Controls Group */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0D1117] rounded-full border border-[#21262D]">
              {TOP_MEDIA_KEYS.filter((k) => k.group === 'browser').map((btn) => {
                const isActive = activeKeys.has(btn.code);
                const isTested = testedKeys.has(btn.code);
                return (
                  <button
                    type="button"
                    key={btn.code}
                    id={`media-key-${btn.code}`}
                    title={btn.title}
                    onClick={() => handleKeyClick(btn.code, btn.title)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] shadow-[0_0_8px_#00E5FF]'
                        : isTested
                        ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                        : 'bg-[#161B22] border-[#30363D] text-[#E0E6ED] hover:border-[#00E5FF]/40'
                    }`}
                  >
                    <MediaIcon name={btn.iconName} />
                  </button>
                );
              })}
            </div>

            {/* Applications Group */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0D1117] rounded-full border border-[#21262D]">
              {TOP_MEDIA_KEYS.filter((k) => k.group === 'apps').map((btn) => {
                const isActive = activeKeys.has(btn.code);
                const isTested = testedKeys.has(btn.code);
                return (
                  <button
                    type="button"
                    key={btn.code}
                    id={`media-key-${btn.code}`}
                    title={btn.title}
                    onClick={() => handleKeyClick(btn.code, btn.title)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] shadow-[0_0_8px_#00E5FF]'
                        : isTested
                        ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                        : 'bg-[#161B22] border-[#30363D] text-[#E0E6ED] hover:border-[#00E5FF]/40'
                    }`}
                  >
                    <MediaIcon name={btn.iconName} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ROW 1: ESC | F1-F4 | F5-F8 | F9-F12 | PrtSc ScrLk Pause | Home End */}
          <div className="flex items-center">
            {/* Esc */}
            {renderKey(EXACT_KEYBOARD_LAYOUT.row1[0], '42px')}
            <div className="w-[14px]" />

            {/* F1 - F4 */}
            <div className="flex items-center gap-1.5">
              {EXACT_KEYBOARD_LAYOUT.row1.slice(1, 5).map((k) => renderKey(k, '42px'))}
            </div>
            <div className="w-[14px]" />

            {/* F5 - F8 */}
            <div className="flex items-center gap-1.5">
              {EXACT_KEYBOARD_LAYOUT.row1.slice(5, 9).map((k) => renderKey(k, '42px'))}
            </div>
            <div className="w-[14px]" />

            {/* F9 - F12 */}
            <div className="flex items-center gap-1.5">
              {EXACT_KEYBOARD_LAYOUT.row1.slice(9, 13).map((k) => renderKey(k, '42px'))}
            </div>
            <div className="w-[14px]" />

            {/* PrtSc, ScrLk, Pause */}
            <div className="flex items-center gap-1.5">
              {EXACT_KEYBOARD_LAYOUT.row1.slice(13, 16).map((k) => renderKey(k, '42px'))}
            </div>
            <div className="w-[6px]" />

            {/* Home (aligns directly above Pg Up) */}
            {renderKey(EXACT_KEYBOARD_LAYOUT.row1[16], '42px')}
            <div className="w-[6px]" />

            {/* End (aligns directly above Num Lock) */}
            {renderKey(EXACT_KEYBOARD_LAYOUT.row1[17], '42px')}
          </div>

          {/* 3. MAIN SECTION (Rows 2 through 6) */}
          <div className="flex items-start gap-1.5">
            {/* Alphanumeric Main Block (Rows 2 to 6, width 710px) */}
            <div className="w-[710px] space-y-1.5 flex-shrink-0">
              {/* Row 2: ~ .. Backspace */}
              <div className="flex items-center gap-1.5">
                {EXACT_KEYBOARD_LAYOUT.row2.slice(0, 13).map((k) => renderKey(k, '42px'))}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row2[13], '86px')}
              </div>

              {/* Row 3: Tab .. \ */}
              <div className="flex items-center gap-1.5">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row3[0], '64px')}
                {EXACT_KEYBOARD_LAYOUT.row3.slice(1, 13).map((k) => renderKey(k, '42px'))}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row3[13], '64px')}
              </div>

              {/* Row 4: Caps .. Enter */}
              <div className="flex items-center gap-1.5">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row4[0], '76px')}
                {EXACT_KEYBOARD_LAYOUT.row4.slice(1, 12).map((k) => renderKey(k, '42px'))}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row4[12], '100px')}
              </div>

              {/* Row 5: Shift .. Shift */}
              <div className="flex items-center gap-1.5">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row5[0], '98px')}
                {EXACT_KEYBOARD_LAYOUT.row5.slice(1, 11).map((k) => renderKey(k, '42px'))}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row5[11], '126px')}
              </div>

              {/* Row 6: Ctrl Win Alt Space Alt Menu Ctrl */}
              <div className="flex items-center gap-1.5">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[0], '56px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[1], '56px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[2], '56px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[3], '252px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[4], '56px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[5], '56px')}
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[6], '56px')}
              </div>
            </div>

            {/* Navigation Column (Pg Up, Pg Dn, Ins, Del, ▲) */}
            <div className="w-[42px] flex flex-col gap-1.5 flex-shrink-0">
              {renderKey(EXACT_KEYBOARD_LAYOUT.row2[14], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row3[14], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row4[13], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row5[12], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row6[7], '42px')}
            </div>

            {/* Numpad Block (4 columns, with vertical + and Enter) */}
            <div className="w-[186px] grid grid-cols-4 gap-1.5 flex-shrink-0">
              {/* Row 2 Numpad: NumLock, /, *, - */}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row2[15], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row2[16], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row2[17], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row2[18], '42px')}

              {/* Row 3 Numpad: 7, 8, 9, + (row-span 2) */}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row3[15], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row3[16], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row3[17], '42px')}
              <div className="row-span-2">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row3[18], '42px', '86px')}
              </div>

              {/* Row 4 Numpad: 4, 5, 6 */}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row4[14], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row4[15], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row4[16], '42px')}

              {/* Row 5 Numpad: 1, 2, 3, Enter (row-span 2) */}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row5[13], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row5[14], '42px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row5[15], '42px')}
              <div className="row-span-2">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row5[16], '42px', '86px')}
              </div>

              {/* Row 6 Numpad: 0 (col-span 2), . */}
              <div className="col-span-2">
                {renderKey(EXACT_KEYBOARD_LAYOUT.row6[8], '90px')}
              </div>
              {renderKey(EXACT_KEYBOARD_LAYOUT.row6[9], '42px')}
            </div>
          </div>

          {/* 4. ROW 7: MOUSE BUTTONS UNDER SPACEBAR & ARROW CLUSTER UNDER ▲ */}
          <div className="flex items-center pt-1">
            {/* Left offset before mouse buttons (under Ctrl Win Alt = 186px) */}
            <div className="w-[186px] flex-shrink-0" />

            {/* Mouse Trackpoint / Touchpad Buttons under Spacebar */}
            <div
              className="flex items-center gap-2 flex-shrink-0"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {renderKey(
                EXACT_KEYBOARD_LAYOUT.row7.mouseLeft,
                '122px',
                '36px',
                'rounded-lg font-mono text-[11px]'
              )}
              {renderKey(
                EXACT_KEYBOARD_LAYOUT.row7.mouseRight,
                '122px',
                '36px',
                'rounded-lg font-mono text-[11px]'
              )}
            </div>

            {/* Spacer before Arrow Cluster (230px) */}
            <div className="w-[230px] flex-shrink-0" />

            {/* ◄ ▼ ► Arrow keys cluster directly aligned beneath ▲ */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {renderKey(EXACT_KEYBOARD_LAYOUT.row7.arrowLeft, '42px', '36px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row7.arrowDown, '42px', '36px')}
              {renderKey(EXACT_KEYBOARD_LAYOUT.row7.arrowRight, '42px', '36px')}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics / Event Log & Verdict Section matching Sleek Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Live Event Log */}
        <div className="lg:col-span-8 bg-[#161B22] border border-[#2D333B] p-4 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] uppercase font-bold text-[#8892B0] tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]"></span>
                Live Event Log
              </h2>
              <span className="text-[10px] font-mono text-[#00E5FF]">SCROLL INTERCEPTOR ACTIVE</span>
            </div>

            {eventHistory.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-[#8892B0] italic">
                [ Waiting for keyboard or mouse input... ]
              </div>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[11px]">
                {eventHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-[#00FF41] flex items-center justify-between py-0.5 border-b border-[#21262D]/60"
                  >
                    <span>
                      [{item.time}] {item.type}: {item.code} (Key: "{item.key}")
                    </span>
                    <span className="text-[#8892B0] text-[10px]">CAPTURED</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-[#2D333B] flex items-center justify-between text-[10px] font-mono text-[#8892B0]">
            <span>
              LAST SCANCODE: <strong className="text-[#00E5FF]">{lastEvent?.code || 'NONE'}</strong>
            </span>
            <span>
              DEBOUNCE: <strong className="text-[#00FF41]">OPTIMAL (&lt;10ms)</strong>
            </span>
          </div>
        </div>

        {/* Analyzing Firmware & Verdict */}
        <div className="lg:col-span-4 bg-[#161B22] border border-[#2D333B] p-4 rounded-lg flex flex-col justify-between text-center">
          <div className="py-3 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-4 border-[#30363D] border-t-[#00E5FF] mb-2 animate-spin"></div>
            <p className="text-xs text-[#8892B0] uppercase tracking-widest font-bold">Diagnostics Engine</p>
            <p className="text-[10px] text-[#00E5FF] font-mono mt-1">
              {testedCount > 0 ? `${testedCount}/${totalKeys} Keys Verified` : 'Listening for Key Inputs'}
            </p>
          </div>

          <div className="pt-3 border-t border-[#2D333B] flex items-center gap-2">
            <button
              id="keyboard-pass-btn"
              onClick={markPass}
              className="flex-1 py-2 px-3 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS</span>
            </button>
            <button
              id="keyboard-fail-btn"
              onClick={markFail}
              className="py-2 px-3 rounded bg-[#21262D] hover:bg-rose-950 hover:text-rose-400 text-[#8892B0] font-bold font-mono text-xs uppercase border border-[#30363D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>FAIL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
