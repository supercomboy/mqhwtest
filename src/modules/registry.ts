// Danh sách bài kiểm tra và công cụ. Thêm mục mới = thêm một entry ở đây + một thư mục trong src/modules/<id>/.
import { mountBench } from './bench';
import { mountCamera } from './camera';
import { mountDisplay } from './display';
import { mountKeyboard } from './keyboard';
import { mountMicrophone } from './microphone';
import { mountSoftware } from './software';
import { mountSpeaker } from './speaker';

export interface TestModule {
  id: 'keyboard' | 'speaker' | 'camera' | 'microphone' | 'display' | 'bench' | 'software';
  title: string;
  description: string;
  /** Nhãn nút mở; mặc định là "Mở bài kiểm tra". */
  actionLabel?: string;
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
    description: 'Quét dải trầm, bổng và phát 2 bản nhạc mẫu, kiểm tra kênh trái, phải.',
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
  {
    id: 'bench',
    title: 'CPU & GPU',
    description: 'Đo hiệu năng CPU, GPU bằng thuật toán song song: kiểm tra tải và benchmark.',
    mount: mountBench,
  },
  {
    id: 'software',
    title: 'Phần mềm',
    description: 'Chọn phần mềm cần cài và tải một script PowerShell cài hàng loạt bằng winget.',
    actionLabel: 'Mở công cụ',
    mount: mountSoftware,
  },
];
