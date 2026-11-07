// Toán học thuần cho bài kiểm tra pin: sức khoẻ pin, xếp loại chai và định dạng số.
// Không đụng DOM để dễ kiểm thử.

export interface CapacityInput {
  /** Dung lượng thiết kế (design capacity) do nhà sản xuất ghi, cùng đơn vị với `full`. */
  design: number;
  /** Dung lượng đầy hiện tại (full charge capacity) đọc từ báo cáo pin của hệ điều hành. */
  full: number;
}

export interface CapacityResult {
  /** Sức khoẻ pin (%), đã chặn trên 100 để hiển thị. */
  health: number;
  /** % chai = 100 − sức khoẻ. */
  wearPct: number;
  /** Dung lượng đã mất (cùng đơn vị với đầu vào). */
  lost: number;
  /** Dung lượng đầy cao hơn thiết kế — số liệu đáng ngờ, cần nhắc người dùng kiểm tra. */
  overDesign: boolean;
}

export function computeHealth({ design, full }: CapacityInput): CapacityResult {
  const raw = (full / design) * 100;
  return {
    health: Math.max(0, Math.min(100, raw)),
    wearPct: Math.max(0, 100 - Math.min(100, raw)),
    lost: Math.max(0, design - full),
    overDesign: full > design,
  };
}

export type HealthClass = 'good' | 'light' | 'clear' | 'heavy';

export interface HealthVerdict {
  cls: HealthClass;
  label: string;
  /** true khi vẫn coi là đạt (good hoặc light). */
  ok: boolean;
}

/** Ngưỡng xếp loại: ≥90 tốt, 80–89 chai nhẹ, 65–79 chai rõ, dưới 65 chai nặng. */
export function classifyHealth(health: number): HealthVerdict {
  if (health >= 90) return { cls: 'good', label: 'Pin còn tốt', ok: true };
  if (health >= 80) return { cls: 'light', label: 'Chai nhẹ', ok: true };
  if (health >= 65) return { cls: 'clear', label: 'Chai rõ rệt', ok: false };
  return { cls: 'heavy', label: 'Chai nặng', ok: false };
}

export function fmtNum(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

export function fmtPct(value: number): string {
  return `${fmtNum(value)}%`;
}

/** Đổi số giờ thành "X giờ Y phút"; trả về "—" khi vô hạn hoặc không hợp lệ. */
export function fmtHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) return '—';
  if (hours >= 48) return `hơn ${Math.floor(hours / 24)} ngày`;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} phút`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m >= 60) return `${h + 1} giờ`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

/** Thời điểm dạng "14:35 ngày 07/11". */
export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
