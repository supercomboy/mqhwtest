import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — gộp class Tailwind, giải quyết xung đột bằng tailwind-merge.
 * Ví dụ: cn("p-2", "p-4") → "p-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}