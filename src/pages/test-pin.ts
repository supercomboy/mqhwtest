import '../styles/tokens.css';
import '../styles/main.css';
import './page.css';
import { mountBattery } from '../modules/battery';

const container = document.getElementById('tool');
if (!container) {
  throw new Error('Thiếu phần tử #tool trong trang test pin.');
}

mountBattery(container);
