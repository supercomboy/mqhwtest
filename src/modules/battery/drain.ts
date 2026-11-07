// Logic phiên đo xả pin: nguồn dữ liệu mức pin (API thật hoặc mô phỏng), thống kê
// tốc độ xả, phát hiện bất thường và lưu/đọc phiên vào localStorage.

export interface BatterySample {
  /** Thời điểm ghi mẫu (performance-independent, dùng Date.now()). */
  t: number;
  /** Mức pin 0–100. */
  level: number;
  /** Đang cắm sạc lúc ghi mẫu. */
  charging: boolean;
}

export interface BatterySnapshot {
  level: number;
  charging: boolean;
}

export interface BatterySource {
  readonly kind: 'real' | 'mock';
  get(): BatterySnapshot;
  /** Đăng ký callback gọi khi mức pin hoặc trạng thái sạc đổi; trả về hàm gỡ. */
  onChange(cb: () => void): () => void;
  dispose?(): void;
}

interface BatteryManagerLike extends EventTarget {
  readonly level: number;
  readonly charging: boolean;
}

/**
 * Nguồn pin thật từ Battery API (Chrome/Edge). Trả về null khi trình duyệt không có
 * API, bị Permissions-Policy chặn hoặc context không an toàn — người dùng sẽ chuyển
 * sang chế độ nhập tay.
 */
export async function createRealBatterySource(): Promise<BatterySource | null> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
  if (typeof nav.getBattery !== 'function') return null;
  let manager: BatteryManagerLike;
  try {
    manager = await nav.getBattery();
  } catch {
    return null;
  }
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const cb of listeners) cb();
  };
  manager.addEventListener('levelchange', notify);
  manager.addEventListener('chargingchange', notify);
  return {
    kind: 'real',
    // Battery API trả mức 0–1; chuẩn hoá về 0–100 để thống nhất với nguồn mô phỏng.
    get: () => ({ level: manager.level * 100, charging: manager.charging }),
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      manager.removeEventListener('levelchange', notify);
      manager.removeEventListener('chargingchange', notify);
      listeners.clear();
    },
  };
}

/**
 * Nguồn mô phỏng cho kiểm thử tự động (`?mock=1`): mức pin tụt 1% mỗi `stepMs`
 * để thấy được biểu đồ và công thức mà không phải chờ xả thật.
 */
export function createMockBatterySource(stepMs = 8000): BatterySource {
  let level = 92;
  const listeners = new Set<() => void>();
  const timer = window.setInterval(() => {
    level = Math.max(0, level - 1);
    for (const cb of listeners) cb();
  }, stepMs);
  return {
    kind: 'mock',
    get: () => ({ level, charging: false }),
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      window.clearInterval(timer);
      listeners.clear();
    },
  };
}

export interface DrainStats {
  sampleCount: number;
  /** Tổng số điểm % đã xả qua các đoạn không sạc. */
  drainedPct: number;
  /** Thời gian từ mẫu đầu tới mẫu cuối (thời gian thực). */
  elapsedMs: number;
  /** Tổng thời gian đang không cắm sạc — dùng chia tốc độ để không bị pha sạc làm sai lệch. */
  dischargingMs: number;
  /** %/giờ; null khi chưa đo đủ 5 phút không sạc. */
  ratePctPerHour: number | null;
  remainingHours: number | null;
  totalHours: number | null;
  /** Công suất trung bình (W) — chỉ có khi biết dung lượng đầy theo Wh. */
  avgPowerW: number | null;
}

/** Đo ít nhất 5 phút không sạc mới đủ tin cậy để tính %/giờ. */
const MIN_RATE_MS = 5 * 60 * 1000;

/**
 * Tính thống kê từ danh sách mẫu. Chỉ cộng Δmức pin trong các đoạn liên tiếp không
 * cắm sạc, nên những lúc cắm sạc giữa chừng không làm tốc độ xả bị bóp méo.
 */
export function computeDrainStats(samples: BatterySample[], fullWh: number | null): DrainStats {
  let drainedPct = 0;
  let dischargingMs = 0;
  let prev: BatterySample | null = null;
  for (const s of samples) {
    if (s.charging) {
      prev = null;
      continue;
    }
    if (prev) {
      drainedPct += prev.level - s.level;
      dischargingMs += s.t - prev.t;
    }
    prev = s;
  }

  const elapsedMs = samples.length >= 2 ? samples[samples.length - 1].t - samples[0].t : 0;
  const ratePctPerHour =
    dischargingMs >= MIN_RATE_MS ? (drainedPct / dischargingMs) * 3_600_000 : null;

  const currentLevel = samples.length > 0 ? samples[samples.length - 1].level : 0;
  const remainingHours = ratePctPerHour && ratePctPerHour > 0 ? currentLevel / ratePctPerHour : null;
  const totalHours = ratePctPerHour && ratePctPerHour > 0 ? 100 / ratePctPerHour : null;
  const avgPowerW =
    fullWh && ratePctPerHour && ratePctPerHour > 0
      ? (ratePctPerHour / 100) * fullWh
      : null;

  return {
    sampleCount: samples.length,
    drainedPct,
    elapsedMs,
    dischargingMs,
    ratePctPerHour,
    remainingHours,
    totalHours,
    avgPowerW,
  };
}

export type AnomalyKey = 'recharge' | 'fastdrop' | 'stall' | 'shutdown';

/**
 * Bất thường đọc được từ chính danh sách mẫu:
 * - recharge: có mẫu ghi đang cắm sạc trong lúc phiên đo chạy.
 * - fastdrop: tụt ≥5 điểm % trong ≤2 phút giữa hai mẫu liên tiếp — dấu hiệu "pin ảo".
 * (stall và shutdown cần bối cảnh ngoài danh sách mẫu,battery.ts tự kiểm tra.)
 */
export function detectAnomalies(samples: BatterySample[]): AnomalyKey[] {
  const keys = new Set<AnomalyKey>();
  let prev: BatterySample | null = null;
  for (const s of samples) {
    if (s.charging) {
      keys.add('recharge');
      prev = null;
      continue;
    }
    if (prev && prev.level - s.level >= 5 && s.t - prev.t <= 2 * 60 * 1000) {
      keys.add('fastdrop');
    }
    prev = s;
  }
  return [...keys];
}

// ---------------- Lưu phiên đo ----------------

export interface StoredCapacity {
  design: string;
  full: string;
  unit: 'wh' | 'mah';
  cycles: string;
}

export interface StoredSession {
  v: 1;
  status: 'active' | 'ended';
  savedAt: number;
  samples: BatterySample[];
  capacity: StoredCapacity;
}

const STORE_KEY = 'mqhwtest.battery.session.v1';

export function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed?.v !== 1 || !Array.isArray(parsed.samples)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(session));
  } catch {
    // Chế độ riêng tư hoặc hết chỗ: bỏ qua, phiên chỉ sống trong tab này.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // Bỏ qua.
  }
}

// ---------------- Tiện ích input datetime-local ----------------

export function toLocalInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseLocalInputValue(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
