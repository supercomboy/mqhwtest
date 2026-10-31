import '../styles/tokens.css';
import '../styles/main.css';
import './page.css';
import { mountMicrophone } from '../modules/microphone';

const container = document.getElementById('tool');
if (!container) {
  throw new Error('Thiếu phần tử #tool trong trang test micro.');
}

mountMicrophone(container);
