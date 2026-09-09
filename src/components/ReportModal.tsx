import React from 'react';
import { X, Printer, Download, CheckCircle2, XCircle, AlertTriangle, Cpu, ShieldCheck } from 'lucide-react';
import { TestId, TestStatus } from '../types';
import { SystemHardwareInfo } from '../utils/systemInfo';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInfo: SystemHardwareInfo;
  testResults: Record<TestId, { status: TestStatus; details?: Record<string, string | number | boolean> }>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  systemInfo,
  testResults,
}) => {
  if (!isOpen) return null;

  const modules: { id: TestId; name: string; icon: string }[] = [
    { id: 'keyboard', name: 'Keyboard', icon: '⌨' },
    { id: 'mouse', name: 'Mouse & Pointer', icon: '🖱' },
    { id: 'camera', name: 'Webcam / Camera', icon: '🎥' },
    { id: 'microphone', name: 'Microphone & Audio Input', icon: '🎤' },
    { id: 'speaker', name: 'Speakers & Stereo Output', icon: '🔊' },
    { id: 'display', name: 'Display & Dead Pixels', icon: '🖥' },
  ];

  const passedCount = modules.filter((m) => testResults[m.id]?.status === 'passed').length;
  const failedCount = modules.filter((m) => testResults[m.id]?.status === 'failed').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      reportTitle: 'Hardware Diagnostics Report',
      timestamp: new Date().toISOString(),
      systemInfo,
      results: testResults,
      summary: {
        totalModules: modules.length,
        passed: passedCount,
        failed: failedCount,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hardware-test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-[#0F1115] border-b border-[#2D333B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight uppercase font-mono">
                Hardware Diagnostics Report
              </h2>
              <p className="text-[10px] text-[#8892B0] font-mono">
                GENERATED {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors border border-[#30363D]"
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleExportJson}
              className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#00E5FF] text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors border border-[#30363D]"
              title="Export JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Summary Banner */}
          <div className="p-4 rounded-lg bg-[#0F1115] border border-[#2D333B] flex flex-wrap items-center justify-between gap-4 font-mono">
            <div>
              <span className="text-[10px] font-bold text-[#8892B0] block uppercase tracking-wider">
                Overall Diagnostic Verdict
              </span>
              <div className="flex items-center gap-2 mt-1">
                {failedCount > 0 ? (
                  <span className="text-base font-bold text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Attention Needed ({failedCount} Issue Detected)
                  </span>
                ) : passedCount >= 5 ? (
                  <span className="text-base font-bold text-[#00FF41] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00FF41]" />
                    All Hardware Checks Verified Passed
                  </span>
                ) : (
                  <span className="text-base font-bold text-[#00E5FF] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#00E5FF]" />
                    Partial Diagnostics ({passedCount}/6 Checked)
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 text-xs font-mono">
              <div className="text-center px-3 py-1.5 rounded bg-[#161B22] border border-[#2D333B]">
                <span className="text-[#00FF41] font-bold text-base block">{passedCount}</span>
                <span className="text-[10px] text-[#8892B0]">PASSED</span>
              </div>
              <div className="text-center px-3 py-1.5 rounded bg-[#161B22] border border-[#2D333B]">
                <span className="text-rose-400 font-bold text-base block">{failedCount}</span>
                <span className="text-[10px] text-[#8892B0]">FAILED</span>
              </div>
              <div className="text-center px-3 py-1.5 rounded bg-[#161B22] border border-[#2D333B]">
                <span className="text-[#8892B0] font-bold text-base block">{6 - passedCount - failedCount}</span>
                <span className="text-[10px] text-[#8892B0]">UNTESTED</span>
              </div>
            </div>
          </div>

          {/* System Hardware Profile */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />
              Detected Machine Architecture
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B]">
                <span className="text-[#8892B0] block text-[10px] uppercase">Operating System</span>
                <span className="text-white font-semibold">{systemInfo.os}</span>
              </div>
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B]">
                <span className="text-[#8892B0] block text-[10px] uppercase">Browser</span>
                <span className="text-white font-semibold">{systemInfo.browser}</span>
              </div>
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B]">
                <span className="text-[#8892B0] block text-[10px] uppercase">Screen Resolution</span>
                <span className="text-white font-semibold">{systemInfo.screenResolution}</span>
              </div>
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B]">
                <span className="text-[#8892B0] block text-[10px] uppercase">CPU Concurrency</span>
                <span className="text-white font-semibold">{systemInfo.logicalCores} Logical Cores</span>
              </div>
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B]">
                <span className="text-[#8892B0] block text-[10px] uppercase">Device Pixel Ratio</span>
                <span className="text-white font-semibold">{systemInfo.devicePixelRatio}x scale</span>
              </div>
              <div className="p-3 bg-[#0F1115] rounded border border-[#2D333B] truncate">
                <span className="text-[#8892B0] block text-[10px] uppercase">Graphics Accelerator</span>
                <span className="text-white font-semibold truncate block" title={systemInfo.gpuRenderer}>
                  {systemInfo.gpuRenderer}
                </span>
              </div>
            </div>
          </div>

          {/* Module Test Results List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider font-mono">
              Component Verification Details
            </h3>
            <div className="space-y-2">
              {modules.map((m) => {
                const res = testResults[m.id];
                const status = res?.status || 'untested';
                const details = res?.details || {};

                return (
                  <div
                    key={m.id}
                    className="p-3 rounded bg-[#0F1115] border border-[#2D333B] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base p-1.5 rounded bg-[#161B22] border border-[#30363D]">
                        {m.icon}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-white block font-mono">{m.name}</span>
                        <div className="text-[11px] text-[#8892B0] font-mono space-x-2">
                          {Object.entries(details).slice(0, 3).map(([k, v]) => (
                            <span key={k}>
                              {k}: <strong className="text-white">{String(v)}</strong>
                            </span>
                          ))}
                          {Object.keys(details).length === 0 && (
                            <span className="text-[#8892B0]/60 italic">No notes recorded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {status === 'passed' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#238636]/20 text-[#00FF41] border border-[#238636]/40 text-[10px] font-bold font-mono uppercase">
                          ✓ PASS
                        </span>
                      )}
                      {status === 'failed' && (
                        <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold font-mono uppercase">
                          FAIL
                        </span>
                      )}
                      {status === 'testing' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 text-[10px] font-bold font-mono uppercase">
                          IN PROGRESS
                        </span>
                      )}
                      {status === 'untested' && (
                        <span className="px-2.5 py-0.5 rounded bg-[#21262D] text-[#8892B0] border border-[#30363D] text-[10px] font-mono uppercase">
                          UNTESTED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0F1115] border-t border-[#2D333B] flex items-center justify-between font-mono">
          <span className="text-[10px] text-[#8892B0]">
            HARDWARE TESTER v1.1 • Zero-database client diagnostic utility
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-bold uppercase border border-[#30363D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
