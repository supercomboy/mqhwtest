import '../styles/tokens.css';
import '../styles/main.css';
import './page.css';
import { mountKeyboard } from '../modules/keyboard';
import { mountOnStart } from './mount-on-start';

const container = document.getElementById('tool');
if (!container) {
  throw new Error('Thiếu phần tử #tool trong trang test bàn phím.');
}

const note = document.createElement('p');
note.className = 'start-note';
note.textContent =
  'Bài kiểm tra bàn phím US ANSI chỉ bắt đầu khi bạn bấm nút dưới đây. Phím tắt trình duyệt vẫn hoạt động bình thường khi đang đọc.';
container.appendChild(note);

mountOnStart(container, 'Bắt đầu test bàn phím', mountKeyboard);
