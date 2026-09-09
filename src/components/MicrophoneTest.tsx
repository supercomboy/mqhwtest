import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, CheckCircle2, XCircle, Play, Square, Circle, ArrowLeft, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { TestStatus } from '../types';
import { getAudioContext } from '../utils/audioUtils';

interface MicrophoneTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

export const MicrophoneTest: React.FC<MicrophoneTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [micLabel, setMicLabel] = useState<string>('Detecting microphone...');
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [volumeLevel, setVolumeLevel] = useState<number>(0); // 0 to 100
  const [signalDetected, setSignalDetected] = useState<boolean>(false);
  const [peakLevel, setPeakLevel] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recording & Playback state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stop mic tracks cleanly
  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start Mic
  const startMic = useCallback(
    async (deviceId?: string) => {
      setErrorMsg(null);
      stopMic();

      try {
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        const track = newStream.getAudioTracks()[0];
        if (track) {
          setMicLabel(track.label || 'Default Microphone');
          const settings = track.getSettings();
          if (settings.sampleRate) {
            setSampleRate(settings.sampleRate);
          }
        }

        // Web Audio Analyser setup
        const ctx = getAudioContext();
        audioCtxRef.current = ctx;
        setSampleRate(ctx.sampleRate);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(newStream);
        sourceRef.current = source;
        source.connect(analyser);

        // Enumerate audio input devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setDeviceList(audioInputs);
        if (track && track.getSettings().deviceId) {
          setSelectedDeviceId(track.getSettings().deviceId || '');
        }

        // Volume Loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);

          // Calculate RMS level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalized = Math.min(100, Math.round((rms / 128) * 100));

          setVolumeLevel(normalized);
          setPeakLevel((p) => Math.max(p, normalized));

          if (normalized > 6) {
            setSignalDetected(true);
            onStatusChange?.('passed', {
              device: track.label || 'Microphone',
              sampleRate: ctx.sampleRate,
              signalDetected: true,
            });
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animFrameRef.current = requestAnimationFrame(updateMeter);
      } catch (err: unknown) {
        console.error('Mic error:', err);
        const errObj = err as { name?: string; message?: string };
        if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
          setErrorMsg('Microphone access denied. Please click the mic icon in your browser URL bar to grant permission.');
        } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
          setErrorMsg('No microphone device found on this system.');
        } else {
          setErrorMsg(errObj.message || 'Failed to access microphone.');
        }
        onStatusChange?.('failed');
      }
    },
    [stopMic, onStatusChange]
  );

  // Start Voice Recording Test
  const startRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);

    try {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setIsRecording(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      };

      recorder.start();
      setIsRecording(true);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 5) {
            // Auto stop after 5 seconds
            stopRecording();
            return 5;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('Failed to create MediaRecorder', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
    }
    setIsRecording(false);
  };

  const playRecordedAudio = () => {
    if (!recordedAudioUrl) return;
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    const audio = new Audio(recordedAudioUrl);
    playbackAudioRef.current = audio;
    setIsPlayingBack(true);
    audio.onended = () => setIsPlayingBack(false);
    audio.play();
  };

  useEffect(() => {
    startMic();
    return () => {
      stopMic();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const markPass = () => {
    onStatusChange?.('passed', {
      device: micLabel,
      sampleRate,
      signalDetected: true,
      manuallyVerified: true,
    });
    if (onNext) onNext();
  };

  const markFail = () => {
    onStatusChange?.('failed', {
      device: micLabel,
      reason: errorMsg || 'No audio signal or distorted sound',
    });
    if (onNext) onNext();
  };

  // Convert volume 0-100 to 20 meter segments
  const totalSegments = 24;
  const activeSegments = Math.round((volumeLevel / 100) * totalSegments);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="mic-back-btn"
              onClick={onBack}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Microphone Diagnostics
              {signalDetected && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#238636] text-[10px] font-bold text-white font-mono shadow-[0_0_8px_rgba(46,160,67,0.4)]">
                  SIGNAL DETECTED
                </span>
              )}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Real-time input sensitivity VU meter & loopback voice playback
            </p>
          </div>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          {deviceList.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startMic(e.target.value);
              }}
              className="bg-[#0D1117] border border-[#30363D] rounded px-3 py-1.5 text-xs text-[#E0E6ED] font-mono focus:outline-none focus:border-[#00E5FF]"
            >
              {deviceList.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            id="mic-retry-btn"
            onClick={() => startMic(selectedDeviceId)}
            className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] text-xs font-mono uppercase flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Main Meter & Test Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Real-time VU Meter & Audio Visualizer */}
        <div className="md:col-span-8 bg-[#161B22] border border-[#2D333B] rounded-lg p-6 flex flex-col justify-between shadow-xl space-y-6">
          {errorMsg ? (
            <div className="text-center p-8 space-y-3 font-mono">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Microphone Error</h4>
              <p className="text-xs text-rose-300/80 leading-relaxed">{errorMsg}</p>
            </div>
          ) : (
            <>
              {/* Volume VU Meter Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Real-time Input Amplitude
                  </span>
                  <span className="text-base font-bold text-[#00E5FF]">
                    {volumeLevel}%
                  </span>
                </div>

                {/* Segmented VU Level Bar */}
                <div className="w-full bg-[#0D1117] border border-[#30363D] rounded p-2 flex gap-1 h-12 items-center">
                  {Array.from({ length: totalSegments }).map((_, idx) => {
                    const isLit = idx < activeSegments;
                    // Color gradient from green -> cyan -> red
                    let colorClass = 'bg-[#00FF41] shadow-[0_0_6px_rgba(0,255,65,0.6)]';
                    if (idx > 18) colorClass = 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]';
                    else if (idx > 12) colorClass = 'bg-[#00E5FF] shadow-[0_0_6px_rgba(0,229,255,0.6)]';

                    return (
                      <div
                        key={idx}
                        className={`flex-1 h-full rounded-sm transition-all duration-75 ${
                          isLit ? colorClass : 'bg-[#21262D]'
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex justify-between text-[10px] text-[#8892B0] font-mono px-1">
                  <span>-40 dB (Silence)</span>
                  <span>-12 dB (Normal Voice)</span>
                  <span>0 dB (Clipping)</span>
                </div>
              </div>

              {/* Recording & Playback Section */}
              <div className="bg-[#0D1117] border border-[#30363D] rounded-lg p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Voice Clarity Loopback Test
                    </span>
                    <span className="text-[10px] text-[#8892B0]">
                      Record a 5-second sample to verify input clarity without background noise.
                    </span>
                  </div>
                  {isRecording && (
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                      <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                      REC 00:0{recordingSeconds} / 00:05
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!isRecording ? (
                    <button
                      id="mic-start-record-btn"
                      onClick={startRecording}
                      disabled={!stream}
                      className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Circle className="w-3 h-3 fill-current" />
                      <span>Start Record</span>
                    </button>
                  ) : (
                    <button
                      id="mic-stop-record-btn"
                      onClick={stopRecording}
                      className="px-4 py-2 rounded bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-bold uppercase flex items-center gap-2 border border-[#30363D] transition-colors"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop Record</span>
                    </button>
                  )}

                  {recordedAudioUrl && (
                    <button
                      id="mic-playback-btn"
                      onClick={playRecordedAudio}
                      className="px-4 py-2 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold uppercase flex items-center gap-2 transition-colors shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isPlayingBack ? 'Playing...' : 'Play Sample'}</span>
                    </button>
                  )}

                  {recordedAudioUrl && (
                    <span className="text-[10px] text-[#00FF41]">
                      ✓ Voice sample ready for evaluation
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Telemetry & Verdict */}
        <div className="md:col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 space-y-4">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider font-mono">
              Audio Telemetry
            </h3>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Input Device</span>
                <span className="text-white font-bold truncate block">{micLabel}</span>
              </div>

              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Sample Rate</span>
                <span className="text-[#00E5FF] font-bold text-sm block">
                  {sampleRate.toLocaleString()} Hz
                </span>
              </div>

              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Detected Peak</span>
                <span className="text-[#00FF41] font-bold text-sm block">
                  {peakLevel}%
                </span>
              </div>
            </div>

            {signalDetected && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#00FF41] bg-[#0D1117] border border-[#238636]/50 p-2.5 rounded">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] flex-shrink-0" />
                <span>Microphone signal active</span>
              </div>
            )}
          </div>

          {/* Verdict Box */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex items-center gap-2">
            <button
              id="mic-pass-btn"
              onClick={markPass}
              className="flex-1 py-2 px-3 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS</span>
            </button>
            <button
              id="mic-fail-btn"
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
