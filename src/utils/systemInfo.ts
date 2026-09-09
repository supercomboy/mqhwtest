export interface SystemHardwareInfo {
  os: string;
  browser: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  colorDepth: number;
  gpuRenderer: string;
  logicalCores: number;
  deviceMemoryGb?: number;
  touchSupport: boolean;
  maxTouchPoints: number;
}

export function detectSystemInfo(): SystemHardwareInfo {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10 / 11';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/OPR\//i.test(ua)) browser = 'Opera';

  // GPU Renderer
  let gpuRenderer = 'Standard Graphics';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL Supported';
      }
    }
  } catch {
    // ignore
  }

  // Logical cores & memory
  const logicalCores = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

  return {
    os,
    browser,
    screenResolution: `${window.screen.width} × ${window.screen.height}`,
    viewportSize: `${window.innerWidth} × ${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth || 24,
    gpuRenderer,
    logicalCores,
    deviceMemoryGb,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };
}
