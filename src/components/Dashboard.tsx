import React from 'react';
import { TestId, TestStatus } from '../types';
import { SystemHardwareInfo } from '../utils/systemInfo';
import {
  Keyboard,
  MousePointer,
  Camera,
  Mic,
  Volume2,
  Monitor,
  Rocket,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

interface DashboardProps {
  onSelectTest: (testId: TestId) => void;
  onStartFullTest: () => void;
  onOpenReport: () => void;
  onResetAll: () => void;
  testResults: Record<TestId, { status: TestStatus; details?: Record<string, string | number | boolean> }>;
  systemInfo: SystemHardwareInfo;
}

interface TestCardConfig {
  id: TestId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tags: string[];
}

const TEST_CARDS: TestCardConfig[] = [
  {
    id: 'keyboard',
    title: 'Keyboard',
    subtitle: 'KeyDown & KeyUp detection, visual ANSI 104 layout, debounce check',
    icon: <Keyboard className="w-7 h-7 text-cyan-400" />,
    tags: ['Keys', 'Scancodes', 'Full Layout'],
  },
  {
    id: 'mouse',
    title: 'Mouse & Pointer',
    subtitle: 'Left, Right, Middle clicks, wheel scrolling & motion sensor tracking',
    icon: <MousePointer className="w-7 h-7 text-cyan-400" />,
    tags: ['Clicks', 'Scroll Wheel', 'Movement'],
  },
  {
    id: 'camera',
    title: 'Camera / Webcam',
    subtitle: 'MediaDevices video stream, resolution detection, FPS measurement & snapshot',
    icon: <Camera className="w-7 h-7 text-cyan-400" />,
    tags: ['Resolution', 'FPS', 'Stream Preview'],
  },
  {
    id: 'microphone',
    title: 'Microphone',
    subtitle: 'Web Audio API volume VU meter, sample rate & voice playback recording',
    icon: <Mic className="w-7 h-7 text-cyan-400" />,
    tags: ['VU Meter', 'Sample Rate', 'Playback'],
  },
  {
    id: 'speaker',
    title: 'Speaker & Audio',
    subtitle: 'Stereo separation (Left, Right, Both channels) & frequency sweep',
    icon: <Volume2 className="w-7 h-7 text-cyan-400" />,
    tags: ['Stereo Left/Right', 'Frequency Sweep'],
  },
  {
    id: 'display',
    title: 'Display & Pixels',
    subtitle: 'Full-color dead pixel check (RGBW, Gray), gradient, contrast & brightness',
    icon: <Monitor className="w-7 h-7 text-cyan-400" />,
    tags: ['Dead Pixel', 'RGB Patterns', 'Fullscreen'],
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectTest,
  onStartFullTest,
  onOpenReport,
  onResetAll,
  testResults,
  systemInfo,
}) => {
  const passedCount = TEST_CARDS.filter((c) => testResults[c.id]?.status === 'passed').length;
  const progressPercent = Math.round((passedCount / TEST_CARDS.length) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Hero Header Section matching Sleek Interface */}
      <div className="relative bg-[#161B22] border border-[#2D333B] rounded-lg p-6 sm:p-8 shadow-xl text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#21262D] border border-[#30363D] text-[#00E5FF] text-[10px] uppercase tracking-wider font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span>
            <span>Online PC Hardware Diagnostics Suite</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-white uppercase tracking-tight">
            Hardware Tester <span className="text-xs sm:text-sm font-mono text-[#00E5FF] ml-2 opacity-90">v1.1</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8892B0] max-w-xl mx-auto">
            Comprehensive, client-side diagnostics for keyboard, mouse, camera, microphone, speakers, and display.
          </p>
        </div>

        {/* Start Full Test CTA matching Sleek Interface */}
        <div className="flex flex-col items-center justify-center gap-2.5 pt-1">
          <button
            id="start-full-test-btn"
            onClick={onStartFullTest}
            className="group bg-[#00E5FF] hover:bg-[#00C2D9] text-[#0F1115] font-bold px-8 sm:px-10 py-3 rounded text-xs sm:text-sm uppercase tracking-tight shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>🚀 Start Full Test</span>
          </button>

          <span className="text-[11px] font-mono text-[#8892B0]">
            Guided sequential verification of all 6 components
          </span>
        </div>

        {/* Progress & Quick Actions */}
        <div className="pt-4 border-t border-[#2D333B] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-48 bg-[#0D1117] h-2 rounded overflow-hidden border border-[#30363D]">
              <div
                className="bg-[#00E5FF] h-full transition-all duration-500 shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[#8892B0]">
              <strong className="text-white">{passedCount}</strong>/{TEST_CARDS.length} PASSED ({progressPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenReport}
              className="text-[#00E5FF] hover:text-[#00C2D9] flex items-center gap-1.5 uppercase transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Diagnostic Report</span>
            </button>
            <span className="text-[#30363D]">|</span>
            <button
              onClick={onResetAll}
              className="text-[#8892B0] hover:text-white flex items-center gap-1.5 uppercase transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Hardware Diagnostic Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] uppercase font-bold text-[#8892B0] flex items-center gap-2 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF]"></span>
            Device Modules
          </h2>
          <span className="text-[10px] font-mono text-[#8892B0]">SELECT MODULE TO TEST</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEST_CARDS.map((card) => {
            const status = testResults[card.id]?.status || 'untested';

            return (
              <div
                key={card.id}
                id={`card-${card.id}`}
                onClick={() => onSelectTest(card.id)}
                className="group relative bg-[#161B22] hover:bg-[#1C2128] border border-[#2D333B] hover:border-[#00E5FF] rounded-lg p-5 shadow transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded bg-[#21262D] border border-[#30363D] text-[#00E5FF] group-hover:border-[#00E5FF] group-hover:shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all">
                      {card.icon}
                    </div>

                    {/* Status Pill matching Sleek Interface */}
                    <div>
                      {status === 'passed' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#238636] border border-[#2EA043] text-white text-[10px] font-bold font-mono shadow-[0_0_8px_rgba(46,160,67,0.3)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PASS</span>
                        </span>
                      )}
                      {status === 'failed' && (
                        <span className="px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-600 text-rose-300 text-[10px] font-bold font-mono flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>FAIL</span>
                        </span>
                      )}
                      {status === 'testing' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#21262D] border-l-2 border-[#00E5FF] text-[#00E5FF] text-[10px] font-mono">
                          ACTIVE
                        </span>
                      )}
                      {status === 'untested' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#21262D] text-[#8892B0] text-[10px] font-mono">
                          READY
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#00E5FF] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[#8892B0] mt-1 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2D333B] flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0D1117] text-[#8892B0] border border-[#30363D]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs font-mono font-bold text-[#00E5FF] group-hover:translate-x-1 transition-transform">
                    {status === 'untested' ? 'TEST →' : 'RETEST →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OS Environment & Machine Specs matching Sleek Interface */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 space-y-3">
        <h2 className="text-[10px] uppercase font-bold text-[#8892B0] flex items-center gap-2 tracking-wider">
          <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />
          OS Environment & Hardware Profile
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded flex flex-col justify-between">
            <span className="text-[#58A6FF] text-[10px] uppercase block mb-1">Platform</span>
            <span className="text-white font-semibold truncate block">{systemInfo.os}</span>
          </div>
          <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded flex flex-col justify-between">
            <span className="text-[#58A6FF] text-[10px] uppercase block mb-1">Browser Engine</span>
            <span className="text-white font-semibold truncate block">{systemInfo.browser}</span>
          </div>
          <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded flex flex-col justify-between">
            <span className="text-[#58A6FF] text-[10px] uppercase block mb-1">Display Resolution</span>
            <span className="text-white font-semibold block">{systemInfo.screenResolution}</span>
          </div>
          <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded flex flex-col justify-between">
            <span className="text-[#58A6FF] text-[10px] uppercase block mb-1">CPU Concurrency</span>
            <span className="text-white font-semibold block">{systemInfo.logicalCores} Logical Cores</span>
          </div>
        </div>
      </div>
    </div>
  );
};
