import React, { useState } from 'react';
import { KeyboardTest } from './KeyboardTest';
import { CameraTest } from './CameraTest';
import { MicrophoneTest } from './MicrophoneTest';
import { SpeakerTest } from './SpeakerTest';
import { DisplayTest } from './DisplayTest';
import { TestId, TestStatus } from '../types';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Sparkles, XCircle, FileText } from 'lucide-react';

interface FullTestWizardProps {
  onFinish: () => void;
  onUpdateStatus: (id: TestId, status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  testResults: Record<TestId, { status: TestStatus; details?: Record<string, string | number | boolean> }>;
  onOpenReport: () => void;
}

const STEPS: { id: TestId; title: string; icon: string }[] = [
  { id: 'keyboard', title: 'Keyboard', icon: '⌨' },
  { id: 'camera', title: 'Camera', icon: '🎥' },
  { id: 'microphone', title: 'Microphone', icon: '🎤' },
  { id: 'speaker', title: 'Speaker', icon: '🔊' },
  { id: 'display', title: 'Display', icon: '🖥' },
];

export const FullTestWizard: React.FC<FullTestWizardProps> = ({
  onFinish,
  onUpdateStatus,
  testResults,
  onOpenReport,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      onFinish();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Wizard Progress Bar */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
              Guided Full Diagnostics Suite
            </span>
            <span className="text-xs text-[#8892B0]">•</span>
            <span className="text-xs text-white font-medium">
              Step {currentStepIndex + 1} of {STEPS.length}: {currentStep.title} Test
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onFinish}
              className="text-xs text-[#8892B0] hover:text-white px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] font-mono transition-colors"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {STEPS.map((step, idx) => {
            const isCompleted = testResults[step.id]?.status === 'passed';
            const isFailed = testResults[step.id]?.status === 'failed';
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`py-2 px-2 rounded text-xs font-mono border flex items-center justify-center gap-1.5 transition-all ${
                  isCurrent
                    ? 'bg-[#00E5FF] text-[#0F1115] border-[#00E5FF] font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                    : isCompleted
                    ? 'bg-[#0D1117] border-[#238636] text-[#00FF41]'
                    : isFailed
                    ? 'bg-[#0D1117] border-rose-600 text-rose-400'
                    : 'bg-[#0D1117] border-[#30363D] text-[#8892B0] hover:text-white'
                }`}
              >
                <span className="text-sm">{step.icon}</span>
                <span className="hidden sm:inline truncate">{step.title}</span>
                {isCompleted && <span className="text-[#00FF41] font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Content */}
      <div className="w-full">
        {currentStep.id === 'keyboard' && (
          <KeyboardTest
            isWizard
            onNext={handleNext}
            onBack={handlePrev}
            onStatusChange={(status, details) => onUpdateStatus('keyboard', status, details)}
          />
        )}
        {currentStep.id === 'camera' && (
          <CameraTest
            isWizard
            onNext={handleNext}
            onBack={handlePrev}
            onStatusChange={(status, details) => onUpdateStatus('camera', status, details)}
          />
        )}
        {currentStep.id === 'microphone' && (
          <MicrophoneTest
            isWizard
            onNext={handleNext}
            onBack={handlePrev}
            onStatusChange={(status, details) => onUpdateStatus('microphone', status, details)}
          />
        )}
        {currentStep.id === 'speaker' && (
          <SpeakerTest
            isWizard
            onNext={handleNext}
            onBack={handlePrev}
            onStatusChange={(status, details) => onUpdateStatus('speaker', status, details)}
          />
        )}
        {currentStep.id === 'display' && (
          <DisplayTest
            isWizard
            onNext={handleNext}
            onBack={handlePrev}
            onStatusChange={(status, details) => onUpdateStatus('display', status, details)}
          />
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex items-center justify-between font-mono">
        <button
          onClick={handlePrev}
          className="px-4 py-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white text-xs font-bold uppercase border border-[#30363D] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentStepIndex === 0 ? 'Dashboard' : 'Previous Step'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenReport}
            className="px-3 py-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#00E5FF] text-xs font-bold uppercase flex items-center gap-1.5 transition-colors border border-[#30363D]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diagnostics Report</span>
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.4)]"
          >
            <span>{isLastStep ? 'Finish & Summary' : 'Next Step'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
