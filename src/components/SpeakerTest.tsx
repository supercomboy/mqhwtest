import React, { useState, useRef } from 'react';
import {
  Volume2,
  Volume1,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Disc,
  Activity,
  Bell,
  Music,
  Mic,
  Radio,
  Sliders,
} from 'lucide-react';
import { TestStatus } from '../types';
import {
  playSpeakerTestTone,
  playFrequencySweep,
  playStereoMusicDemo,
  SpeakerSoundType,
} from '../utils/audioUtils';

interface SpeakerTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

export const SpeakerTest: React.FC<SpeakerTestProps> = ({
  onStatusChange,
  onBack,
  isWizard: _isWizard,
  onNext,
}) => {
  const [soundType, setSoundType] = useState<SpeakerSoundType>('chime');
  const [playingChannel, setPlayingChannel] = useState<'left' | 'right' | 'both' | null>(null);
  const [leftConfirmed, setLeftConfirmed] = useState(false);
  const [rightConfirmed, setRightConfirmed] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [activeSweepFreq, setActiveSweepFreq] = useState<number | null>(null);
  const [musicStage, setMusicStage] = useState<'left' | 'center' | 'right' | 'surround' | null>(null);

  const activeSoundRef = useRef<{ stop: () => void } | null>(null);

  const stopActiveAudio = () => {
    if (activeSoundRef.current) {
      activeSoundRef.current.stop();
      activeSoundRef.current = null;
    }
    setPlayingChannel(null);
    setActiveSweepFreq(null);
    setMusicStage(null);
  };

  const playChannel = (channel: 'left' | 'right' | 'both') => {
    stopActiveAudio();
    setPlayingChannel(channel);

    const sound = playSpeakerTestTone(channel, soundType, volume);
    activeSoundRef.current = sound;

    const playDuration = soundType === 'melody' ? 3800 : soundType === 'drum' ? 1200 : 2000;
    setTimeout(() => {
      setPlayingChannel((current) => (current === channel ? null : current));
    }, playDuration);
  };

  const playMusicDemo = () => {
    stopActiveAudio();
    setPlayingChannel('both');
    const demo = playStereoMusicDemo(volume, (stage) => {
      setMusicStage(stage);
    });
    activeSoundRef.current = demo;

    setTimeout(() => {
      setPlayingChannel(null);
      setMusicStage(null);
    }, 4000);
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
      soundTypeTested: soundType,
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
      soundTypeTested: soundType,
    });
    if (onNext) onNext();
  };

  const soundOptions: {
    id: SpeakerSoundType;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'chime',
      label: 'Chuông du dương',
      description: 'Âm sắc ấm áp, êm dịu, không chói tai',
      icon: Bell,
    },
    {
      id: 'melody',
      label: 'Nhạc mẫu Stereo',
      description: 'Giai điệu lượn từ Trái sang Phải',
      icon: Music,
    },
    {
      id: 'voice',
      label: 'Giọng nói chỉ dẫn',
      description: 'Đọc rõ kênh Trái / Phải',
      icon: Mic,
    },
    {
      id: 'drum',
      label: 'Trống trầm & bổng',
      description: 'Kick bass trầm & Snare thử màng loa',
      icon: Radio,
    },
    {
      id: 'sine',
      label: 'Sóng sin kỹ thuật',
      description: 'Tần số tham chiếu chuẩn 440Hz/880Hz',
      icon: Activity,
    },
  ];

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
              Speaker Diagnostics • Kiểm tra Âm thanh Loa
              {playingChannel && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#00E5FF]/20 text-[10px] font-bold text-[#00E5FF] font-mono border border-[#00E5FF]/30 animate-pulse">
                  {musicStage ? `STAGE: ${musicStage.toUpperCase()}` : `ĐANG PHÁT ${playingChannel.toUpperCase()}`}
                </span>
              )}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Kiểm tra cân bằng âm lượng 2 kênh Trái - Phải & thử độ rè của màng loa
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

      {/* Sound Selection Toolbar */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Chọn kiểu âm thanh kiểm tra (Sound Type)
            </span>
          </div>
          <span className="text-[10px] text-[#8892B0]">Đổi kiểu phát tức thì</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {soundOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = soundType === opt.id;
            return (
              <button
                key={opt.id}
                id={`sound-type-${opt.id}`}
                onClick={() => {
                  stopActiveAudio();
                  setSoundType(opt.id);
                }}
                className={`p-2.5 rounded border text-left transition-all flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-white shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0D1117] border-[#30363D] text-[#8892B0] hover:border-[#8892B0] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold font-mono flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00E5FF]' : 'text-[#8892B0]'}`} />
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                  )}
                </div>
                <span className="text-[10px] leading-tight opacity-75 font-sans line-clamp-1">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stereo Audio Channel Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Stereo Channel Triggers */}
        <div className="md:col-span-7 bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider">
                Stereo Channel Balance (Kênh Âm Thanh)
              </span>
              <span className="text-[10px] text-[#00E5FF] font-mono">
                Kiểu hiện tại: {soundOptions.find((s) => s.id === soundType)?.label}
              </span>
            </div>

            {/* Stereo Visualizer Graphics */}
            <div className="grid grid-cols-2 gap-3 py-2">
              {/* Left Speaker Box */}
              <div
                className={`p-4 rounded border transition-all flex flex-col items-center text-center space-y-3 font-mono ${
                  playingChannel === 'left' ||
                  playingChannel === 'both' ||
                  musicStage === 'left' ||
                  musicStage === 'surround'
                    ? 'bg-[#0D1117] border-[#00E5FF] shadow-[0_0_18px_rgba(0,229,255,0.3)] ring-1 ring-[#00E5FF]/50'
                    : 'bg-[#0D1117] border-[#30363D]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded border flex items-center justify-center transition-transform ${
                    playingChannel === 'left' ||
                    playingChannel === 'both' ||
                    musicStage === 'left' ||
                    musicStage === 'surround'
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] scale-105 shadow-[0_0_15px_#00E5FF]'
                      : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                  }`}
                >
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">LOA TRÁI (LEFT)</span>
                  <span className="text-[10px] text-[#8892B0]">Pan -1.0 • Kênh Trái</span>
                </div>
                <button
                  id="play-left-channel-btn"
                  onClick={() => playChannel('left')}
                  className="w-full py-2 px-3 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase transition-all shadow-[0_0_8px_rgba(0,229,255,0.3)] active:scale-95"
                >
                  {playingChannel === 'left' ? 'ĐANG PHÁT...' : 'PHÁT LOA TRÁI'}
                </button>
              </div>

              {/* Right Speaker Box */}
              <div
                className={`p-4 rounded border transition-all flex flex-col items-center text-center space-y-3 font-mono ${
                  playingChannel === 'right' ||
                  playingChannel === 'both' ||
                  musicStage === 'right' ||
                  musicStage === 'surround'
                    ? 'bg-[#0D1117] border-[#00E5FF] shadow-[0_0_18px_rgba(0,229,255,0.3)] ring-1 ring-[#00E5FF]/50'
                    : 'bg-[#0D1117] border-[#30363D]'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded border flex items-center justify-center transition-transform ${
                    playingChannel === 'right' ||
                    playingChannel === 'both' ||
                    musicStage === 'right' ||
                    musicStage === 'surround'
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-[#0F1115] scale-105 shadow-[0_0_15px_#00E5FF]'
                      : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
                  }`}
                >
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">LOA PHẢI (RIGHT)</span>
                  <span className="text-[10px] text-[#8892B0]">Pan +1.0 • Kênh Phải</span>
                </div>
                <button
                  id="play-right-channel-btn"
                  onClick={() => playChannel('right')}
                  className="w-full py-2 px-3 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase transition-all shadow-[0_0_8px_rgba(0,229,255,0.3)] active:scale-95"
                >
                  {playingChannel === 'right' ? 'ĐANG PHÁT...' : 'PHÁT LOA PHẢI'}
                </button>
              </div>
            </div>

            {/* Both Speakers, Music Demo, and Frequency Sweep Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
              <button
                id="play-both-channel-btn"
                onClick={() => playChannel('both')}
                className="py-2.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <Disc className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>{playingChannel === 'both' && !musicStage ? 'ĐANG PHÁT...' : 'CẢ 2 LOA'}</span>
              </button>

              <button
                id="play-music-demo-btn"
                onClick={playMusicDemo}
                className="py-2.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <Music className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>{musicStage ? `STEREO: ${musicStage.toUpperCase()}` : 'NHẠC MẪU STEREO'}</span>
              </button>

              <button
                id="speaker-frequency-sweep-btn"
                onClick={startSweep}
                className="py-2.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
                <span>
                  {activeSweepFreq ? `SWEEP: ${activeSweepFreq} Hz` : 'SWEEP (80-8kHz)'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-[#0D1117] border border-[#30363D] rounded text-[#8892B0] text-[11px] font-mono flex items-start gap-2">
            <span className="text-[#00E5FF] font-bold">MẸO:</span>
            <span>
              Hãy đeo tai nghe hoặc ngồi chính giữa hai loa máy tính để cảm nhận rõ sự phân bổ âm thanh độc lập của từng bên.
            </span>
          </div>
        </div>

        {/* Right: Verification Checkboxes & Verdict */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4">
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 space-y-4">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider font-mono">
              Xác nhận thực tế âm thanh từng bên
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
                  <span className="text-xs font-bold text-white block">Loa trái nghe rõ, không rè</span>
                  <span className="text-[10px] text-[#8892B0]">Âm lượng bên tai trái bình thường</span>
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
                  <span className="text-xs font-bold text-white block">Loa phải nghe rõ, không rè</span>
                  <span className="text-[10px] text-[#8892B0]">Âm lượng bên tai phải bình thường</span>
                </div>
              </label>
            </div>

            <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] text-xs space-y-1 font-mono">
              <div className="flex justify-between text-[#8892B0]">
                <span>Kênh Loa Trái:</span>
                <span className={leftConfirmed ? 'text-[#00FF41] font-bold' : 'text-[#8892B0]'}>
                  {leftConfirmed ? '✓ ĐÃ XÁC NHẬN' : 'Chưa xác nhận'}
                </span>
              </div>
              <div className="flex justify-between text-[#8892B0]">
                <span>Kênh Loa Phải:</span>
                <span className={rightConfirmed ? 'text-[#00FF41] font-bold' : 'text-[#8892B0]'}>
                  {rightConfirmed ? '✓ ĐÃ XÁC NHẬN' : 'Chưa xác nhận'}
                </span>
              </div>
              <div className="flex justify-between text-[#8892B0] pt-1 border-t border-[#30363D]">
                <span>Kiểu âm thanh:</span>
                <span className="text-[#00E5FF] font-bold">
                  {soundOptions.find((s) => s.id === soundType)?.label}
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
              <span>LOA TỐT (PASS)</span>
            </button>
            <button
              id="speaker-fail-btn"
              onClick={markFail}
              className="py-2 px-4 rounded bg-[#21262D] hover:bg-rose-950 hover:text-rose-400 text-[#8892B0] font-bold font-mono text-xs uppercase border border-[#30363D] transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>LOA LỖI (FAIL)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SpeakerTest;
