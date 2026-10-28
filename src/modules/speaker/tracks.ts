// Khai báo 3 file âm thanh: 1 file quét dải trầm/bổng và 2 bản nhạc mẫu.
// Đường dẫn dựng tương đối theo BASE_URL vì site chạy trong thư mục con của GitHub Pages.

export interface Track {
  id: string;
  title: string;
  description: string;
  /** Tên file trong public/audio/. */
  file: string;
  /** Mốc thời gian (giây) của từng đoạn trong file, dùng để hiện đoạn đang phát. */
  segments?: Array<{ at: number; label: string }>;
}

/** Thư mục chứa file âm thanh, tính theo BASE_URL (không dùng '/audio/...'). */
export const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

export const tracks: Track[] = [
  {
    id: 'music-1',
    title: 'Dải trầm và bổng',
    description:
      'Âm chuẩn 1 kHz, quét dải trầm 200 → 30 Hz, quét dải bổng 2 000 → 16 000 Hz rồi giữ 40 Hz. Nghe ở âm lượng vừa phải.',
    file: 'speaker-sweep.mp3',
    segments: [
      { at: 0, label: '1 kHz — âm chuẩn' },
      { at: 2.5, label: 'Dải trầm 200 → 30 Hz' },
      { at: 15, label: 'Dải bổng 2 000 → 16 000 Hz' },
      { at: 23.5, label: '40 Hz — tiếng ù' },
    ],
  },
  {
    id: 'music-2',
    title: 'Bản nhạc 2',
    description: 'Nghe tiếp để so sánh âm lượng và độ rõ của loa trái và loa phải.',
    file: 'speaker-test-1.mp3',
  },
  {
    id: 'music-3',
    title: 'Bản nhạc 3',
    description: 'Bản dài hơn: nghe ở âm lượng vừa phải để phát hiện rè, rung hoặc mất cân bằng kéo dài.',
    file: 'speaker-test-2.mp3',
  },
];
