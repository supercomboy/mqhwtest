// Danh sách bài kiểm tra. Thêm bài mới = thêm một mục ở đây + một thư mục trong src/modules/<id>/.
import { mountCamera } from './camera';
import { mountDisplay } from './display';
import { mountKeyboard } from './keyboard';
import { mountMicrophone } from './microphone';
import { mountSpeaker } from './speaker';

export interface TestModule {
  id: 'keyboard' | 'speaker' | 'camera' | 'microphone' | 'display';
  title: string;
  description: string;
  /** Dựng bài kiểm tra vào `container`, trả về hàm dọn dẹp (gỡ listener, giải phóng tài nguyên). */
  mount?: (container: HTMLElement) => () => void;
}

export const modules: TestModule[] = [
  {
    id: 'keyboard',
    title: 'Bàn phím',
    description: 'Bố cục US ANSI cho PC và MacBook. Mỗi phím nhấn sẽ sáng lên.',
    mount: mountKeyboard,
  },
  {
    id: 'speaker',
    title: 'Loa',
    description: 'Phát 3 bản nhạc mẫu và kiểm tra kênh trái, phải.',
    mount: mountSpeaker,
  },
  {
    id: 'camera',
    title: 'Camera',
    description: 'Xem trước hình ảnh, độ phân giải và chụp thử.',
    mount: mountCamera,
  },
  {
    id: 'microphone',
    title: 'Microphone',
    description: 'Đo mức âm theo thời gian thực, ghi âm 5 giây và nghe lại.',
    mount: mountMicrophone,
  },
  {
    id: 'display',
    title: 'Màn hình',
    description: 'Điểm chết, loang sáng, dải xám và độ giật hình.',
    mount: mountDisplay,
  },
];
