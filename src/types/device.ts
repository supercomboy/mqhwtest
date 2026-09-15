import type { LucideIcon } from "lucide-react";

export type DeviceId =
  | "keyboard"
  | "speaker"
  | "microphone"
  | "camera"
  | "display";

export type DeviceStatus =
  | "ready"
  | "testing"
  | "passed"
  | "warning"
  | "error"
  | "permission-required"
  | "not-available";

export interface DeviceMeta {
  id: DeviceId;
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
  order: number;
}

/**
 * Kết quả phát hiện khả năng trình duyệt cho một module.
 */
export interface DeviceCapability {
  supported: boolean;
  /** Lý do nếu không hỗ trợ. VD: "Web Audio API is not available" */
  reason?: string;
}

export type DeviceCapabilityMap = Record<DeviceId, DeviceCapability>;