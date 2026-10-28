// Khai báo 3 file mp3 dùng cho bài kiểm tra loa.
// Đường dẫn dựng tương đối theo BASE_URL vì site chạy trong thư mục con của GitHub Pages.

export interface Track {
  id: string;
  title: string;
  description: string;
  /** Tên file trong public/audio/. */
  file: string;
}

/** Thư mục chứa file âm thanh, tính theo BASE_URL (không dùng '/audio/...'). */
export const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

export const tracks: Track[] = [
  {
    id: 'music-1',
    title: 'Bản nhạc 1',
    description: 'Nghe chất âm tổng thể, độ rõ và độ cân bằng giữa hai kênh.',
    file: 'speaker-test.mp3',
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
