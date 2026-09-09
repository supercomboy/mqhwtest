export type TestId = 'dashboard' | 'keyboard' | 'mouse' | 'camera' | 'microphone' | 'speaker' | 'display';

export type TestStatus = 'untested' | 'testing' | 'passed' | 'failed';

export interface TestResult {
  id: TestId;
  status: TestStatus;
  notes?: string;
  timestamp?: number;
  details?: Record<string, string | number | boolean>;
}

export interface KeyboardState {
  detectedTotal: number;
  testedKeys: Set<string>;
  activeKeys: Set<string>;
  lastKeyDown?: {
    code: string;
    key: string;
    keyCode: number;
    timestamp: number;
  };
}

export interface MouseState {
  leftClicked: boolean;
  rightClicked: boolean;
  middleClicked: boolean;
  leftClicksCount: number;
  rightClicksCount: number;
  middleClicksCount: number;
  wheelUpCount: number;
  wheelDownCount: number;
  lastDeltaY: number;
  posX: number;
  posY: number;
  distanceTraveled: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  resolution?: { width: number; height: number };
  aspectRatio?: string;
  fps?: number;
}

export interface MicDeviceInfo {
  deviceId: string;
  label: string;
  sampleRate?: number;
  channelCount?: number;
}

export type DisplayPattern = 
  | 'black' 
  | 'white' 
  | 'red' 
  | 'green' 
  | 'blue' 
  | 'gray' 
  | 'gradient' 
  | 'contrast' 
  | 'brightness'
  | 'grid';
