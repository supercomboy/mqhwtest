import React, { useState, useEffect } from 'react';
import { TestId, TestStatus } from './types';
import { detectSystemInfo, SystemHardwareInfo } from './utils/systemInfo';
import { createInitialTestResults, TestResultsMap, updateTestResult } from './utils/testResults';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { KeyboardTest } from './components/KeyboardTest';
import { CameraTest } from './components/CameraTest';
import { MicrophoneTest } from './components/MicrophoneTest';
import { SpeakerTest } from './components/SpeakerTest';
import { DisplayTest } from './components/DisplayTest';
import { FullTestWizard } from './components/FullTestWizard';
import { ReportModal } from './components/ReportModal';

export default function App() {
  const [currentView, setCurrentView] = useState<TestId>('dashboard');
  const [isWizardMode, setIsWizardMode] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  const [systemInfo, setSystemInfo] = useState<SystemHardwareInfo>(() => detectSystemInfo());

  const [testResults, setTestResults] = useState<TestResultsMap>(() => createInitialTestResults());

  useEffect(() => {
    setSystemInfo(detectSystemInfo());
  }, []);

  const handleUpdateStatus = (
    id: TestId,
    status: TestStatus,
    details?: Record<string, string | number | boolean>
  ) => {
    setTestResults((prev) => updateTestResult(prev, id, status, details));
  };

  const handleSelectView = (view: TestId) => {
    setIsWizardMode(false);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartFullTest = () => {
    setIsWizardMode(true);
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetAll = () => {
    setTestResults(createInitialTestResults());
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E0E6ED] flex flex-col font-sans selection:bg-[#00E5FF] selection:text-[#0F1115] antialiased">
      {/* Top Sticky Navigation */}
      <Navbar
        currentView={isWizardMode ? ('dashboard' as TestId) : currentView}
        onSelectView={handleSelectView}
        onOpenReport={() => setIsReportOpen(true)}
        testResults={testResults}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {isWizardMode ? (
          <FullTestWizard
            onFinish={() => setIsWizardMode(false)}
            onUpdateStatus={handleUpdateStatus}
            testResults={testResults}
            onOpenReport={() => setIsReportOpen(true)}
          />
        ) : (
          <>
            {currentView === 'dashboard' && (
              <Dashboard
                onSelectTest={handleSelectView}
                onStartFullTest={handleStartFullTest}
                onOpenReport={() => setIsReportOpen(true)}
                onResetAll={handleResetAll}
                testResults={testResults}
                systemInfo={systemInfo}
              />
            )}

            {currentView === 'keyboard' && (
              <KeyboardTest
                onBack={() => setCurrentView('dashboard')}
                onStatusChange={(status, details) => handleUpdateStatus('keyboard', status, details)}
              />
            )}

            {currentView === 'camera' && (
              <CameraTest
                onBack={() => setCurrentView('dashboard')}
                onStatusChange={(status, details) => handleUpdateStatus('camera', status, details)}
              />
            )}

            {currentView === 'microphone' && (
              <MicrophoneTest
                onBack={() => setCurrentView('dashboard')}
                onStatusChange={(status, details) => handleUpdateStatus('microphone', status, details)}
              />
            )}

            {currentView === 'speaker' && (
              <SpeakerTest
                onBack={() => setCurrentView('dashboard')}
                onStatusChange={(status, details) => handleUpdateStatus('speaker', status, details)}
              />
            )}

            {currentView === 'display' && (
              <DisplayTest
                onBack={() => setCurrentView('dashboard')}
                onStatusChange={(status, details) => handleUpdateStatus('display', status, details)}
              />
            )}
          </>
        )}
      </main>

      {/* Printable / Exportable Diagnostics Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        systemInfo={systemInfo}
        testResults={testResults}
      />

      {/* Sleek Interface Footer */}
      <footer className="px-6 sm:px-8 py-3 bg-[#0D1117] border-t border-[#2D333B] flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#8892B0] font-mono tracking-wider">HARDWARE TESTER • SESSION: HT-882-X</span>
          <span className="hidden sm:inline text-xs text-[#2D333B]">|</span>
          <span className="hidden sm:inline text-[10px] text-[#58A6FF] font-mono">ONLINE PC HARDWARE DIAGNOSTICS</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-[#8892B0]">PRIVACY: <span className="text-[#E0E6ED]">OFFLINE-ONLY</span></span>
          <span className="text-[#00E5FF]">ENCRYPTION: NONE (LOCAL-TEST)</span>
        </div>
      </footer>
    </div>
  );
}
