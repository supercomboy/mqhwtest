import '../styles/tokens.css';
import '../styles/main.css';
import './page.css';
import { mountSpeaker } from '../modules/speaker';

const container = document.getElementById('tool');
if (!container) {
  throw new Error('Thiếu phần tử #tool trong trang test loa.');
}

mountSpeaker(container);
