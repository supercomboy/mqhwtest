import React from 'react';
import { TestId, TestStatus } from '../types';
import {
  ShieldCheck,
  Keyboard,
  MousePointer,
  Camera,
  Mic,
  Volume2,
  Monitor,
  LayoutGrid,
  FileText,
  Maximize2,
} from 'lucide-react';

interface NavbarProps {
  currentView: TestId;
  onSelectView: (view: TestId) => void;
  onOpenReport: () => void;
  testResults: Record<TestId, { status: TestStatus }>;
}

const NAV_ITEMS: { id: TestId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-4 h-4" /> },
  { id: 'mouse', label: 'Mouse', icon: <MousePointer className="w-4 h-4" /> },
  { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> },
  { id: 'microphone', label: 'Mic', icon: <Mic className="w-4 h-4" /> },
  { id: 'speaker', label: 'Speaker', icon: <Volume2 className="w-4 h-4" /> },
  { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenReport,
  testResults,
}) => {
  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#161B22] border-b border-[#2D333B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Logo & Brand matching Sleek Interface */}
        <div
          id="nav-brand-logo"
          onClick={() => onSelectView('dashboard')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.15)] group-hover:border-[#00E5FF] transition-all">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase flex items-center">
              Hardware Tester
              <span className="text-xs font-mono text-[#00E5FF] ml-2 opacity-90">v1.1</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#8892B0]">
              Online PC Hardware Diagnostics
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#0D1117] p-1 rounded-md border border-[#2D333B] text-xs">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            const status = item.id !== 'dashboard' ? testResults[item.id]?.status : undefined;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectView(item.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-tight flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#21262D] text-white border-l-2 border-[#00E5FF] font-bold shadow-sm'
                    : 'text-[#8892B0] hover:text-white hover:bg-[#21262D]/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {status === 'passed' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] shadow-[0_0_6px_rgba(0,255,65,0.7)]" />
                )}
                {status === 'failed' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-[#8892B0] uppercase tracking-wider font-mono">System Status</span>
            <span className="text-xs font-mono text-[#00FF41] font-bold tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
              ALL SYSTEMS NOMINAL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="nav-report-btn"
              onClick={onOpenReport}
              className="px-3 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-[#00E5FF] border border-[#2D333B] text-xs font-mono uppercase tracking-tight flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>

            <button
              id="nav-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              className="p-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#2D333B] transition-colors"
              title="Toggle fullscreen browser window"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Subnav */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 bg-[#0D1117] border-t border-[#2D333B] text-xs scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase flex-shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#21262D] text-white border-l-2 border-[#00E5FF] font-bold'
                  : 'text-[#8892B0] hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
