import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CheckCircle2, XCircle, RefreshCw, FlipHorizontal, ArrowLeft, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { TestStatus } from '../types';

interface CameraTestProps {
  onStatusChange?: (status: TestStatus, details?: Record<string, string | number | boolean>) => void;
  onBack?: () => void;
  isWizard?: boolean;
  onNext?: () => void;
}

export const CameraTest: React.FC<CameraTestProps> = ({
  onStatusChange,
  onBack,
  isWizard,
  onNext,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraLabel, setCameraLabel] = useState<string>('Detecting...');
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(Date.now());
  const animFrameIdRef = useRef<number | null>(null);

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Request camera and init stream
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setErrorMsg(null);
      setIsCapturing(true);

      // Stop old tracks first
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          setCameraLabel(videoTrack.label || 'Default Camera');
          if (settings.width && settings.height) {
            setResolution({ width: settings.width, height: settings.height });
          }
          if (settings.frameRate) {
            setFps(Math.round(settings.frameRate));
          }
        }

        // List available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setDeviceList(videoDevices);
        if (videoTrack && videoTrack.getSettings().deviceId) {
          setSelectedDeviceId(videoTrack.getSettings().deviceId || '');
        }

        onStatusChange?.('testing');
      } catch (err: unknown) {
        console.error('Camera stream error:', err);
        const errObj = err as { name?: string; message?: string };
        if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
          setErrorMsg('Camera access denied. Please click the camera icon in your browser URL bar to allow camera access.');
        } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
          setErrorMsg('No camera hardware found on this computer.');
        } else {
          setErrorMsg(errObj.message || 'Failed to open camera.');
        }
        onStatusChange?.('failed', { error: errObj.name || 'Unknown' });
      } finally {
        setIsCapturing(false);
      }
    },
    [stream, onStatusChange]
  );

  // Measure live FPS
  useEffect(() => {
    let active = true;

    const measureFps = () => {
      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastFpsCheckRef.current;
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        if (active) setFps(currentFps);
        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;
      }
      if (active) {
        animFrameIdRef.current = requestAnimationFrame(measureFps);
      }
    };

    if (stream) {
      animFrameIdRef.current = requestAnimationFrame(measureFps);
    }

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [stream]);

  // Handle video metadata loaded to get actual resolution
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w > 0 && h > 0) {
        setResolution({ width: w, height: h });
        onStatusChange?.('passed', {
          device: cameraLabel,
          resolution: `${w} × ${h}`,
          fps,
        });
      }
    }
  };

  // Capture snapshot photo
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setSnapshotUrl(canvas.toDataURL('image/png'));
    }
  };

  // Start on mount, cleanup on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopTracks();
    };
  }, []);

  const markPass = () => {
    onStatusChange?.('passed', {
      device: cameraLabel,
      resolution: resolution ? `${resolution.width} × ${resolution.height}` : 'Active',
      fps,
      verified: true,
    });
    if (onNext) onNext();
  };

  const markFail = () => {
    onStatusChange?.('failed', {
      device: cameraLabel,
      reason: errorMsg || 'User reported camera issue',
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
              id="camera-back-btn"
              onClick={onBack}
              className="p-2 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded bg-[#21262D] text-[#00E5FF] border border-[#30363D]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Camera Diagnostics
              {stream && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#238636] text-[10px] font-bold text-white font-mono flex items-center gap-1 shadow-[0_0_8px_rgba(46,160,67,0.4)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE STREAM
                </span>
              )}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8892B0]">
              Webcam video feed, sensor resolution & framerate monitor
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {deviceList.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="bg-[#0D1117] border border-[#30363D] rounded px-3 py-1.5 text-xs text-[#E0E6ED] font-mono focus:outline-none focus:border-[#00E5FF]"
            >
              {deviceList.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            id="camera-mirror-btn"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`p-1.5 px-3 rounded border text-xs font-mono uppercase flex items-center gap-1.5 transition-colors ${
              isMirrored ? 'bg-[#21262D] border-[#00E5FF] text-[#00E5FF]' : 'bg-[#21262D] border-[#30363D] text-[#8892B0]'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Mirror</span>
          </button>

          <button
            id="camera-restart-btn"
            onClick={() => startCamera(selectedDeviceId)}
            className="p-1.5 px-3 rounded bg-[#21262D] hover:bg-[#30363D] text-[#8892B0] hover:text-white border border-[#30363D] text-xs font-mono uppercase flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCapturing ? 'animate-spin' : ''}`} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Video Canvas Box */}
        <div className="md:col-span-8 bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex flex-col justify-between overflow-hidden shadow-xl relative">
          <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center border border-[#30363D]">
            {errorMsg ? (
              <div className="text-center p-6 space-y-3 max-w-sm font-mono">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
                <p className="text-xs text-rose-300/80 leading-relaxed">{errorMsg}</p>
                <button
                  onClick={() => startCamera()}
                  className="mt-2 px-4 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-white text-xs rounded border border-[#30363D] transition-colors"
                >
                  Retry Permission
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={handleLoadedMetadata}
                className={`w-full h-full object-contain ${isMirrored ? '-scale-x-100' : ''}`}
              />
            )}

            {/* In-Preview HUD */}
            {stream && (
              <div className="absolute top-3 left-3 bg-[#0F1115]/90 backdrop-blur-md border border-[#30363D] rounded px-2.5 py-1 text-[10px] font-mono text-[#00FF41] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-ping" />
                REC LIVE • {fps} FPS
              </div>
            )}

            {stream && (
              <button
                id="camera-snapshot-btn"
                onClick={takeSnapshot}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded bg-[#00E5FF] hover:bg-[#00c5dd] text-[#0F1115] text-xs font-bold font-mono uppercase flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Test Snapshot</span>
              </button>
            )}
          </div>

          {/* Captured Snapshot Drawer */}
          {snapshotUrl && (
            <div className="mt-3 p-3 bg-[#0D1117] border border-[#30363D] rounded flex items-center justify-between font-mono">
              <div className="flex items-center gap-3">
                <img
                  src={snapshotUrl}
                  alt="Snapshot test"
                  className="w-16 h-10 object-cover rounded border border-[#30363D]"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Snapshot Captured</span>
                  <span className="text-[10px] text-[#00FF41]">Sensor captured frame successfully</span>
                </div>
              </div>
              <button
                onClick={() => setSnapshotUrl(null)}
                className="text-xs text-[#8892B0] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Telemetry & Result */}
        <div className="md:col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 space-y-4">
            <h3 className="text-[10px] font-bold text-[#8892B0] uppercase tracking-wider font-mono">
              Hardware Details
            </h3>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Device</span>
                <span className="text-white font-bold truncate block">{cameraLabel}</span>
              </div>

              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Resolution</span>
                <span className="text-[#00E5FF] font-bold text-sm block">
                  {resolution ? `${resolution.width} × ${resolution.height}` : 'Querying...'}
                </span>
              </div>

              <div className="p-3 bg-[#0D1117] rounded border border-[#30363D] space-y-1">
                <span className="text-[#8892B0] text-[10px] uppercase block">Estimated Framerate</span>
                <span className="text-[#00FF41] font-bold text-sm block">
                  {fps > 0 ? `${fps} FPS` : 'Measuring...'}
                </span>
              </div>
            </div>

            {stream && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#00FF41] bg-[#0D1117] border border-[#238636]/50 p-2.5 rounded">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] flex-shrink-0" />
                <span>Webcam stream verified</span>
              </div>
            )}
          </div>

          {/* Verdict Box */}
          <div className="bg-[#161B22] border border-[#2D333B] rounded-lg p-4 flex items-center gap-2">
            <button
              id="camera-pass-btn"
              onClick={markPass}
              className="flex-1 py-2 px-3 rounded bg-[#238636] hover:bg-[#2EA043] text-white font-bold font-mono text-xs uppercase shadow-[0_0_10px_rgba(46,160,67,0.4)] transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASS</span>
            </button>
            <button
              id="camera-fail-btn"
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
