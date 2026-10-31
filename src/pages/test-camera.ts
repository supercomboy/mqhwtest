import '../styles/tokens.css';
import '../styles/main.css';
import './page.css';
import { mountCamera } from '../modules/camera';

const container = document.getElementById('tool');
if (!container) {
  throw new Error('Thiếu phần tử #tool trong trang test camera.');
}

mountCamera(container);
