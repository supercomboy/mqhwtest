import React, { useState, useRef } from 'react';
import { Volume2, Volume1, VolumeX, CheckCircle2, XCircle, ArrowLeft, Disc, Activity } from 'lucide-react';
import { TestStatus } from '../types';
import { playSpeakerTestTone, playFrequencySweep } from '../utils/audioUtils';

interface SpeakerTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

export const SpeakerTest: React.FC<SpeakerTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [playingChannel, setPlayingChannel] = useState<'left' | 'right' | 'both' | null>(null);
  const [leftConfirmed, setLeftConfirmed] = useState(false);
  const [rightConfirmed, setRightConfirmed] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeSweepFreq, setActiveSweepFreq] = useState<number | null>(null);

  const activeSoundRef = useRef<{ stop: () => void } | null>(null);

  const stopActiveAudio = () => {
    if (activeSoundRef.current) {
      activeSoundRef.current.stop();
      activeSoundRef.current = null;
    }
    setPlayingChannel(null);
    setActiveSweepFreq(null);
  };

  const playChannel = (channel: 'left' | 'right' | 'both') => {
    stopActiveAudio();
    setPlayingChannel(channel);

    const freq = channel === 'left' ? 440 : channel === 'right' ? 880 : 554;
    const sound = playSpeakerTestTone(channel, freq, 2.0, volume);
    activeSoundRef.current = sound;

    setTimeout(() => {
      setPlayingChannel((current) => (current === channel ? null : current));
    }, 2000);
  };

  const startSweep = () => {
    stopActiveAudio();
    setActiveSweepFreq(80);
    const sweep = playFrequencySweep(80, 8000, 5, volume, (freq) => {
      setActiveSweepFreq(freq);
    });
    activeSoundRef.current = sweep;

    setTimeout(() => {
      setActiveSweepFreq(null);
    }, 5100);
  };

  const markPass = () => {
    stopActiveAudio();
    onStatusChange?.('passed', {
      leftSpeaker: leftConfirmed,
      rightSpeaker: rightConfirmed,
      volumeTested: Math.round(volume * 100),
      manuallyVerified: true,
    });
    if (onNext) onNext();
  };

  const markFail = () => {
    stopActiveAudio();
    onStatusChange?.('failed', {
      leftSpeaker: leftConfirmed,
      rightSpeaker: rightConfirmed,
    });
    if (onNext) onNext();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="speaker-back-btn"
              onClick={() => {
                stopActiveAudio();
                onBack();
              }}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Speaker Diagnostics
              {playingChannel && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF]/20 text-[10px] font-bold text-[#00E5FF] font-mono border border-[#00E5FF]/30 animate-pulse">
                  PLAYING {playingChannel.toUpperCase()}
                </span>
              )}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Stereo acoustic pan balance, separation & frequency sweep
            </p>
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center gap-3 bg-[#0D1117] px-3 py-1.5 rounded border border-[#30363D]">
          <Volume1 className="w-4 h-4 text-[#8892B0]" />
          <input
            id="speaker-volume-range"
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-[#00E5FF] cursor-pointer"
          />
          <span className="text-xs font-mono text-[#00E5FF] w-8">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Main Stereo Audio Channel Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Stereo Channel Triggers */}
        <div className="md:col-span-7 bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider">
                Stereo Channel Separation
              </span>
              <span className="text-[10px] text-[#8892B0]">Synthesized Web Audio</span>
            </div>

            {/* Stereo Visualizer Graphics */}
            <div className="grid grid-cols-2 gap-3 py-2">
              {/* Left Speaker Box */}
              <div
                className={`p-4 rounded border transition-all flex flex-col items-center text-center space-y-3 font-mono ${
                  playingChannel === 'left' || playingChannel === 'both'
                    ? 'bg-[#0D1117] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                    : 'bg-[#0D1117] border-[#30363D]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded border flex items-center justify-center transition-transform ${
                    playingChannel === 'left' || playingChannel === 'both'
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] animate-pulse'
                      : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                  }`}
                >
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">LEFT CHANNEL</span>
                  <span className="text-[10px] text-[#8892B0]">Pan -1.0 • 440 Hz</span>
                </div>
                <button
                  id="play-left-channel-btn"
                  onClick={() => playChannel('left')}
                  className="w-full py-1.5 px-3 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase transition-all shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                >
                  {playingChannel === 'left' ? 'PLAYING...' : 'PLAY LEFT'}
                </button>
              </div>

              {/* Right Speaker Box */}
              <div
                className={`p-4 rounded border transition-all flex flex-col items-center text-center space-y-3 font-mono ${
                  playingChannel === 'right' || playingChannel === 'both'
                    ? 'bg-[#0D1117] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                    : 'bg-[#0D1117] border-[#30363D]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded border flex items-center justify-center transition-transform ${
                    playingChannel === 'right' || playingChannel === 'both'
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] animate-pulse'
                      : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                  }`}
                >
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">RIGHT CHANNEL</span>
                  <span className="text-[10px] text-[#8892B0]">Pan +1.0 • 880 Hz</span>
                </div>
                <button
                  id="play-right-channel-btn"
                  onClick={() => playChannel('right')}
                  className="w-full py-1.5 px-3 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase transition-all shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                >
                  {playingChannel === 'right' ? 'PLAYING...' : 'PLAY RIGHT'}
                </button>
              </div>
            </div>

            {/* Both Speakers and Frequency Sweep Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 font-mono">
              <button
                id="play-both-channel-btn"
                onClick={() => playChannel('both')}
                className="flex-1 py-2 px-3 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Disc className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>{playingChannel === 'both' ? 'PLAYING BOTH...' : 'PLAY BOTH SPEAKERS'}</span>
              </button>

              <button
                id="speaker-frequency-sweep-btn"
                onClick={startSweep}
                className="flex-1 py-2 px-3 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
                <span>
                  {activeSweepFreq ? `SWEEP: ${activeSweepFreq} Hz` : 'SWEEP (80Hz-8kHz)'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-[#0D1117] border border-[#30363D] rounded text-[#8892B0] text-[11px] font-mono flex items-start gap-2">
            <span className="text-[#00E5FF] font-bold">INFO:</span>
            <span>
              Listen for distinct channel separation in headphones or stereo monitor speakers.
            </span>
          </div>
        </div>

        {/* Right: Verification Checkboxes & Verdict */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4">
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 space-y-4">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider font-mono">
              Physical Acoustic Verification
            </h3>

            <div className="space-y-2.5 font-mono">
              <label
                id="check-left-speaker"
                className="flex items-center gap-3 p-3 rounded bg-[#0D1117] border border-[#30363D] hover:border-[#00E5FF]/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={leftConfirmed}
                  onChange={(e) => setLeftConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00E5FF] accent-[#00E5FF] cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Left speaker audible</span>
                  <span className="text-[10px] text-[#8892B0]">Tone heard clearly on left ear</span>
                </div>
              </label>

              <label
                id="check-right-speaker"
                className="flex items-center gap-3 p-3 rounded bg-[#0D1117] border border-[#30363D] hover:border-[#00E5FF]/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={rightConfirmed}
                  onChange={(e) => setRightConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00E5FF] accent-[#00E5FF] cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Right speaker audible</span>
                  <span className="text-[10px] text-[#8892B0]">Tone heard clearly on right ear</span>
                </div>
              </label>
            </div>

            <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] text-xs space-y-1 font-mono">
              <div className="flex justify-between text-[#8892B0]">
                <span>Left Channel:</span>
                <span className={leftConfirmed ? 'text-[#00FF41] font-bold' : 'text-[#8892B0]'}>
                  {leftConfirmed ? '✓ CONFIRMED' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between text-[#8892B0]">
                <span>Right Channel:</span>
                <span className={rightConfirmed ? 'text-[#00FF41] font-bold' : 'text-[#8892B0]'}>
                  {rightConfirmed ? '✓ CONFIRMED' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Verdict Box */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex items-center gap-2">
            <button
              id="speaker-pass-btn"
              onClick={markPass}
              className="flex-1 py-2 px-3 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS</span>
            </button>
            <button
              id="speaker-fail-btn"
              onClick={markFail}
              className="py-2 px-4 rounded bg-[#21262D] hover:bg-rose-950 hover:text-rose-400 text-[#8892B0] font-bold font-mono text-xs uppercase border border-[#30363D] transition-colors flex items-center justify-center gap-1.5"
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
