import { Camera, Keyboard, Mic, Monitor, Volume2 } from "lucide-react";

import type { DeviceMeta } from "@/types/device";

/**
 * Registry trung tâm cho 5 module test.
 * Thêm module mới = thêm 1 entry ở đây + 1 route trong App.tsx.
 */
export const DEVICES: DeviceMeta[] = [
  {
    id: "keyboard",
    path: "/keyboard",
    title: "Keyboard",
    description: "Test every key on your keyboard.",
    icon: Keyboard,
    order: 1,
  },
  {
    id: "speaker",
    path: "/speaker",
    title: "Speaker",
    description: "Verify audio playback through your speakers.",
    icon: Volume2,
    order: 2,
  },
  {
    id: "microphone",
    path: "/microphone",
    title: "Microphone",
    description: "Measure live input level from your microphone.",
    icon: Mic,
    order: 3,
  },
  {
    id: "camera",
    path: "/camera",
    title: "Camera",
    description: "Preview live feed from your webcam.",
    icon: Camera,
    order: 4,
  },
  {
    id: "display",
    path: "/display",
    title: "Display",
    description: "Check colors, gradients, and pixel uniformity.",
    icon: Monitor,
    order: 5,
  },
];

/** Truy cập nhanh theo id. */
export function getDevice(id: string): DeviceMeta | undefined {
  return DEVICES.find((d) => d.id === id);
}