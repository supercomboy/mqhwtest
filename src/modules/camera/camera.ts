// Bài kiểm tra camera: xem trước, độ phân giải thực tế, lật gương và chụp thử.
// Hình ảnh chỉ nằm trong bộ nhớ trang, không bao giờ được gửi lên máy chủ nào.
import './camera.css';

/** Hai lựa chọn tự đánh giá, kèm gợi ý xử lý khi hình ảnh có vấn đề. */
const ANSWERS: Array<{ id: string; label: string; note: string }> = [
  { id: 'ok', label: 'Đạt', note: 'Hình ảnh rõ, màu sắc và độ sáng bình thường.' },
  {
    id: 'bad',
    label: 'Chưa đạt',
    note: 'Thử lau ống kính, tăng ánh sáng phía trước, chọn camera khác ở trên, hoặc đóng ứng dụng khác đang dùng camera.',
  },
];

const UNSUPPORTED =
  'Trình duyệt này không hỗ trợ truy cập camera (thiếu getUserMedia). Hãy thử Chrome, Edge, Firefox hoặc Safari phiên bản mới.';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function errorName(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
}

/** Dịch lỗi getUserMedia thành hướng dẫn tiếng Việt. */
function describeError(err: unknown): string {
  switch (errorName(err)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Bạn đã từ chối quyền dùng camera. Mở lại quyền cho trang này trong cài đặt trình duyệt (biểu tượng ổ khoá cạnh địa chỉ), rồi bấm “Bật lại”.';
    case 'SecurityError':
      return 'Trang phải chạy trên HTTPS hoặc localhost mới dùng được camera.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Không tìm thấy camera nào trên máy này.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera đang bị ứng dụng khác chiếm dụng. Đóng ứng dụng đó rồi thử lại.';
    case 'OverconstrainedError':
      return 'Camera không đáp ứng được yêu cầu. Hãy chọn camera khác rồi thử lại.';
    default:
      return `Không bật được camera${errorName(err) ? ` (${errorName(err)})` : ''}. Hãy thử lại.`;
  }
}

export function mountCamera(container: HTMLElement): () => void {
  // ---- Trạng thái ----
  let stream: MediaStream | null = null;
  let deviceId = '';
  let mirror = true;
  const supported = typeof navigator.mediaDevices?.getUserMedia === 'function';

  // ---- Khung chính ----
  const root = el('div', 'cam');

  const noticeEl = el('div', 'cam__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  const intro = el(
    'p',
    'cam__intro',
    'Bài kiểm tra sẽ mở camera của bạn để xem trước. Hình ảnh chỉ hiển thị trên máy này, không được tải lên đâu cả. Quyền camera chỉ được xin khi bạn bấm nút bên dưới.',
  );

  // ---- Thẻ bắt đầu (khi camera chưa bật) ----
  const startText = el(
    'p',
    'cam__start-text',
    supported
      ? 'Bấm “Bật camera” để xem trước hình ảnh và kiểm tra độ phân giải.'
      : UNSUPPORTED,
  );
  const enableBtn = el('button', 'btn cam__enable', 'Bật camera');
  enableBtn.type = 'button';
  if (!supported) enableBtn.disabled = true;
  const startCard = el('div', 'cam__start');
  startCard.append(startText, enableBtn);

  // ---- Khu vực xem trước ----
  const video = el('video', 'cam__video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.classList.toggle('cam__video--mirror', mirror);

  const resChip = el('span', 'cam__chip', 'Độ phân giải: —');
  const fpsChip = el('span', 'cam__chip', 'FPS: —');
  /** Độ phân giải lớn nhất camera báo hỗ trợ — chỉ Chrome/Edge có getCapabilities. */
  const capChip = el('span', 'cam__chip', 'Tối đa: —');
  capChip.hidden = true;
  const chips = el('div', 'cam__chips');
  chips.append(resChip, fpsChip, capChip);

  const frame = el('div', 'cam__frame');
  frame.append(video, chips);

  const mirrorInput = el('input', 'cam__mirror-input');
  mirrorInput.type = 'checkbox';
  mirrorInput.checked = mirror;
  const mirrorLabel = el('label', 'cam__switch');
  mirrorLabel.append(mirrorInput, el('span', 'cam__switch-text', 'Lật gương'));
  mirrorLabel.title = 'Lật ngang hình xem trước (không đổi luồng gốc)';

  const deviceSelect = el('select', 'cam__select');
  deviceSelect.id = 'cam-device';
  deviceSelect.setAttribute('aria-label', 'Chọn camera');
  const defaultOpt = el('option', undefined, 'Camera mặc định');
  defaultOpt.value = '';
  deviceSelect.append(defaultOpt);
  const deviceWrap = el('div', 'cam__device');
  deviceWrap.hidden = true;
  deviceWrap.append(el('span', 'cam__device-label', 'Camera'), deviceSelect);

  const shotBtn = el('button', 'btn btn--ghost cam__shot-btn', 'Chụp thử');
  shotBtn.type = 'button';
  const offBtn = el('button', 'btn cam__off', 'Tắt camera');
  offBtn.type = 'button';

  const controls = el('div', 'cam__controls');
  controls.append(shotBtn, mirrorLabel, deviceWrap, offBtn);

  const shotImg = el('img', 'cam__shot-img');
  shotImg.alt = 'Ảnh chụp thử từ camera';
  const shotFig = el('figure', 'cam__shot');
  shotFig.hidden = true;
  shotFig.append(shotImg, el('figcaption', 'cam__shot-caption', 'Ảnh chụp thử (chỉ hiển thị trong trang này)'));

  const live = el('div', 'cam__live');
  live.hidden = true;
  live.append(frame, controls, shotFig);

  // ---- Bảng tổng hợp kết quả ----
  const deviceCell = el('td', 'cam-table__value', '—');
  const resCell = el('td', 'cam-table__value', '—');
  const shotCell = el('td', 'cam-table__value', 'Chưa chụp');
  const answerCell = el('td', 'cam-table__value', '—');
  const adviceEl = el('p', 'cam__advice');

  const table = el('table', 'cam-table');
  const thead = el('thead');
  const headRow = el('tr');
  headRow.append(el('th', undefined, 'Hạng mục'), el('th', undefined, 'Kết quả'));
  thead.append(headRow);
  const tbody = el('tbody');
  const builtIn = (label: string, cell: HTMLTableCellElement): HTMLTableRowElement => {
    const row = el('tr');
    const th = el('th', undefined, label);
    th.setAttribute('scope', 'row');
    row.append(th, cell);
    return row;
  };
  tbody.append(
    builtIn('Camera', deviceCell),
    builtIn('Độ phân giải', resCell),
    builtIn('Ảnh chụp', shotCell),
    builtIn('Nhận xét', answerCell),
  );
  table.append(el('caption', undefined, 'Tổng hợp kết quả'), thead, tbody);

  // ---- Tự đánh giá ----
  const answerBtns = ANSWERS.map((answer) => {
    const btn = el('button', 'cam-seg__btn', answer.label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      answerCell.textContent = answer.label;
      answerCell.classList.toggle('cam-table__value--bad', answer.id !== 'ok');
      adviceEl.textContent = answer.note;
      for (const other of answerBtns) other.setAttribute('aria-pressed', String(other === btn));
    });
    return btn;
  });

  const answerGroup = el('div', 'cam-seg');
  answerGroup.setAttribute('role', 'group');
  answerGroup.setAttribute('aria-label', 'Hình ảnh có bình thường không');
  answerGroup.append(...answerBtns);

  const confirmSection = el('section', 'cam__section');
  confirmSection.append(
    el('h3', 'cam__section-title', 'Hình ảnh có bình thường không?'),
    answerGroup,
    adviceEl,
    table,
  );

  root.append(intro, noticeEl, startCard, live, confirmSection);
  container.append(root);

  // ---- Canvas dùng để chụp thử (không hiển thị) ----
  const canvas = document.createElement('canvas');

  // ---- Luồng camera ----
  const openStream = async (): Promise<MediaStream> => {
    const md = navigator.mediaDevices;
    const wanted: MediaTrackConstraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: 'user' };
    // "ideal" là ràng buộc mềm: trình duyệt tự chọn khung hình lớn nhất mà camera hỗ trợ
    // (720p, 1080p, 4K…), nên không bao giờ gây OverconstrainedError trên camera thật.
    const native: MediaTrackConstraints = {
      width: { ideal: 3840 },
      height: { ideal: 2160 },
    };
    try {
      return await md.getUserMedia({ audio: false, video: { ...wanted, ...native } });
    } catch (err) {
      if (errorName(err) === 'OverconstrainedError') {
        // Ràng buộc không thỏa được: xin lại kiểu tối giản.
        return await md.getUserMedia({ audio: false, video: true });
      }
      throw err;
    }
  };

  const stopStream = (): void => {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.onended = null;
      track.stop();
    }
    stream = null;
    video.srcObject = null;
  };

  const updateDeviceCell = (label: string): void => {
    deviceCell.textContent = label || 'Camera mặc định';
  };

  /**
   * Kích thước khung hình thật của phần tử video — chính xác hơn getSettings() ngay lúc mở luồng,
   * và tự cập nhật khi camera đổi mode (ví dụ đổi camera hoặc đổi độ phân giải).
   */
  const syncResolution = (): void => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    const size = `${width} × ${height} px`;
    resChip.textContent = `Độ phân giải: ${size}`;
    resCell.textContent = size;
  };

  video.addEventListener('loadedmetadata', syncResolution);
  video.addEventListener('resize', syncResolution);

  const attach = (next: MediaStream, resetShot: boolean): void => {
    stopStream();
    stream = next;
    video.srcObject = next;
    void video.play().catch(() => undefined);

    const track = next.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        notice('Camera đã bị ngắt kết nối hoặc bị ứng dụng khác lấy mất.');
        stop();
      };
      const settings = track.getSettings();
      if (typeof settings.deviceId === 'string' && settings.deviceId) deviceId = settings.deviceId;
      const hasSize = typeof settings.width === 'number' && typeof settings.height === 'number';
      const size = hasSize ? `${settings.width} × ${settings.height} px` : '—';
      resChip.textContent = `Độ phân giải: ${size}`;
      resCell.textContent = size;
      fpsChip.textContent =
        typeof settings.frameRate === 'number' ? `FPS: ${Math.round(settings.frameRate)}` : 'FPS: —';
      updateDeviceCell(track.label || '');

      // Độ phân giải tối đa mà phần cứng khai báo (không phải mode đang chạy).
      const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
      const maxWidth = caps?.width?.max;
      const maxHeight = caps?.height?.max;
      if (typeof maxWidth === 'number' && typeof maxHeight === 'number') {
        capChip.textContent = `Tối đa: ${maxWidth} × ${maxHeight}`;
        capChip.hidden = false;
      } else {
        capChip.textContent = 'Tối đa: —';
        capChip.hidden = true;
      }

      syncResolution();
    }

    if (resetShot) {
      shotFig.hidden = true;
      shotImg.removeAttribute('src');
      shotCell.textContent = 'Chưa chụp';
    }

    live.hidden = false;
    startCard.hidden = true;
    void refreshDevices();
  };

  const stop = (): void => {
    stopStream();
    live.hidden = true;
    startCard.hidden = false;
    deviceWrap.hidden = true;
    resChip.textContent = 'Độ phân giải: —';
    fpsChip.textContent = 'FPS: —';
    capChip.textContent = 'Tối đa: —';
    capChip.hidden = true;
    resCell.textContent = '—';
    deviceCell.textContent = '—';
  };

  const start = async (): Promise<void> => {
    if (!supported) {
      notice(UNSUPPORTED);
      return;
    }
    enableBtn.disabled = true;
    enableBtn.textContent = 'Đang xin quyền…';
    try {
      const next = await openStream();
      attach(next, true);
      notice('');
    } catch (err) {
      notice(describeError(err));
    } finally {
      enableBtn.disabled = false;
      enableBtn.textContent = 'Bật lại';
    }
  };

  const switchDevice = async (id: string): Promise<void> => {
    const previous = deviceId;
    deviceId = id;
    // Đổi camera cần mở lại luồng: dừng luồng cũ trước để nhường thiết bị.
    stopStream();
    try {
      const next = await openStream();
      attach(next, false);
      notice('');
    } catch (err) {
      deviceId = previous;
      notice(describeError(err));
      // Cố gắng mở lại camera cũ để màn hình không bị tối.
      try {
        attach(await openStream(), false);
      } catch {
        stop();
      }
    }
  };

  const capture = (): void => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      notice('Chưa có hình ảnh để chụp. Hãy đợi camera sẵn sàng rồi thử lại.');
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    if (!g) return;
    if (mirror) {
      g.translate(width, 0);
      g.scale(-1, 1);
    }
    g.drawImage(video, 0, 0, width, height);
    g.setTransform(1, 0, 0, 1, 0, 0);
    shotImg.src = canvas.toDataURL('image/png');
    shotFig.hidden = false;
    shotCell.textContent = `${width} × ${height} px`;
    notice('');
  };

  // ---- Danh sách camera ----
  let deviceCleanup: (() => void) | null = null;

  async function refreshDevices(): Promise<void> {
    const md = navigator.mediaDevices;
    if (!md) return;
    try {
      const devices = (await md.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      while (deviceSelect.options.length > 1) deviceSelect.remove(1);
      devices.forEach((device, index) => {
        const opt = el('option', undefined, device.label || `Camera ${index + 1}`);
        opt.value = device.deviceId;
        deviceSelect.append(opt);
      });
      if (stream) {
        // Tên thiết bị chỉ có sau khi đã được cấp quyền.
        deviceSelect.value = deviceId;
        const active = devices.find((d) => d.deviceId === deviceId);
        if (active) updateDeviceCell(active.label || '');
      }
      deviceWrap.hidden = !stream || devices.length === 0;
    } catch {
      deviceWrap.hidden = true;
    }
  }

  enableBtn.addEventListener('click', () => {
    void start();
  });

  offBtn.addEventListener('click', () => {
    stop();
    notice('Đã tắt camera.');
  });

  shotBtn.addEventListener('click', () => {
    capture();
  });

  mirrorInput.addEventListener('change', () => {
    mirror = mirrorInput.checked;
    video.classList.toggle('cam__video--mirror', mirror);
  });

  deviceSelect.addEventListener('change', () => {
    const id = deviceSelect.value;
    if (!id || id === deviceId) return;
    void switchDevice(id);
  });

  if (navigator.mediaDevices) {
    const onDeviceChange = (): void => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    deviceCleanup = () => {
      navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
    };
  }

  const onPageHide = (): void => {
    stopStream();
  };
  window.addEventListener('pagehide', onPageHide);

  // ---- Dọn dẹp khi rời bài kiểm tra ----
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    video.removeEventListener('loadedmetadata', syncResolution);
    video.removeEventListener('resize', syncResolution);
    stopStream();
    shotImg.removeAttribute('src');
    deviceCleanup?.();
    deviceCleanup = null;
    root.remove();
  };
}
