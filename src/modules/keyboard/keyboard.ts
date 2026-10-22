// Bài kiểm tra bàn phím US ANSI. Dùng event.code (vị trí vật lý) để đánh dấu phím,
// event.key chỉ để hiển thị. Không dùng keyCode (đã lỗi thời).
import './keyboard.css';
import {
  arrowRows,
  functionRow,
  macRowBottom,
  mainRows,
  navCluster,
  numpadKeys,
  type KeyDef,
  type LayoutMode,
} from './layout';
import { checkUsLayout, compareTyped, ISO_CODES, TYPING_SAMPLE } from './detect';

type Mode = LayoutMode;

const LOG_LIMIT = 6;
const STUCK_REPEAT_THRESHOLD = 60;
const MAX_ROLLOVER_DISPLAY = 10;
/** Số cột lưới cho mỗi 1u (để biểu diễn được cả bề rộng 1,25u và 6,25u). */
const COLS_PER_UNIT = 4;
/** Khoảng cách giữa các khối, tính theo u; được cộng vào tổng đơn vị. */
const BLOCK_GAP_UNITS = 0.5;

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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, [contenteditable]'));
}

/** Phím cần chặn hành vi mặc định khi bài kiểm tra đang mở. */
const PREVENT_CODES = new Set<string>([
  'Space',
  'Backspace',
  'ContextMenu',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'AltLeft',
  'AltRight',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`).filter((f) => f !== 'F11'),
]);

function shouldPrevent(e: KeyboardEvent): boolean {
  if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyR' || e.code === 'KeyW')) return true;
  if (!PREVENT_CODES.has(e.code)) return false;
  // Để nút/ô nhập vẫn kích hoạt được bằng Space khi đang được focus.
  if (e.code === 'Space' && isInteractiveTarget(e.target)) return false;
  return true;
}

// ---- Tổng số đơn vị (u) của từng chế độ, suy ra từ dữ liệu bố cục ----
const widthOf = (k: KeyDef): number => k.width ?? 1;
/** Bề rộng ở chế độ MacBook: bàn phím Mac hẹp hơn để Backspace/Enter/Shift đúng dáng. */
const widthMacOf = (k: KeyDef): number => k.widthMac ?? widthOf(k);
const rowUnits = (row: KeyDef[]): number => row.reduce((sum, k) => sum + widthOf(k), 0);
const maxRowUnits = (rows: KeyDef[][]): number => Math.max(...rows.map(rowUnits));
/** Tổng đơn vị của một hàng ở chế độ MacBook — bỏ những phím chỉ có trên bàn phím PC. */
const macRowUnits = (row: KeyDef[]): number =>
  row.reduce((sum, k) => (k.mode === 'pc' ? sum : sum + widthMacOf(k)), 0);
const round = (v: number): number => Number(v.toFixed(3));

/** Khối phím chính rộng 15u ở PC, 14,5u ở MacBook. */
const MAIN_UNITS = round(maxRowUnits(mainRows));
const MAIN_UNITS_MAC = round(
  Math.max(...mainRows.map(macRowUnits), macRowUnits(macRowBottom)),
);
/** Cụm điều hướng 3u (chỉ có ở chế độ PC). */
const NAV_UNITS = round(maxRowUnits(navCluster));
/** Cụm mũi tên 3u. */
const ARROW_UNITS = round(maxRowUnits(arrowRows));
/** Bàn phím số 4u (chỉ có ở chế độ PC), lấy từ cột lớn nhất trong dữ liệu. */
const NUMPAD_UNITS = round(
  Math.max(...numpadKeys.map((k) => (k.col ?? 1) + widthOf(k) - 1)),
);

const TOTAL_UNITS: Record<Mode, number> = {
  pc: round(MAIN_UNITS + BLOCK_GAP_UNITS + NAV_UNITS + BLOCK_GAP_UNITS + NUMPAD_UNITS),
  // MacBook: chỉ còn khối phím chính — mũi tên đã nằm ngay trong hàng dưới.
  mac: round(MAIN_UNITS_MAC),
};

/** Các phím không xuất hiện ở chế độ MacBook. */
const MAC_HIDDEN = new Set<string>([
  ...[...navCluster.flat(), ...numpadKeys].map((k) => k.code),
  'ContextMenu',
  'ControlRight',
]);

export function mountKeyboard(container: HTMLElement): () => void {
  // ---- Trạng thái ----
  const pressed = new Set<string>();
  const seen = new Set<string>();
  const repeatCounts = new Map<string, number>();
  const stuck = new Set<string>();
  let maxRollover = 0;
  let isoDetected = false;
  let mode: Mode = window.innerWidth < 900 ? 'mac' : 'pc';
  let locks = { CapsLock: false, NumLock: false, ScrollLock: false };
  const log: Array<{ code: string; key: string; type: 'down' | 'up'; at: number }> = [];
  const startedAt = performance.now();

  /** Một mã phím có thể có nhiều phần tử: mũi tên xuất hiện ở cụm giữa (PC) và ở hàng dưới (MacBook). */
  const codeEls = new Map<string, HTMLElement[]>();
  const registerKey = (node: HTMLElement, code: string): void => {
    const list = codeEls.get(code);
    if (list) list.push(node);
    else codeEls.set(code, [node]);
  };
  /** Phần tử có bề rộng khác nhau giữa hai chế độ — đổi khi chuyển chế độ. */
  const widthEls: Array<{ node: HTMLElement; def: KeyDef }> = [];
  const applyKeyWidth = (node: HTMLElement, k: KeyDef): void => {
    const units = mode === 'mac' ? widthMacOf(k) : widthOf(k);
    node.style.gridColumn = `span ${Math.round(units * COLS_PER_UNIT)}`;
  };

  // ---- Khung giao diện ----
  const root = el('div', 'kbm');

  const bar = el('div', 'kbm__bar');

  const stats = el('div', 'kbm__stats');
  const progress = el('span', 'kbm__progress');
  const progressCount = el('b', '', '0');
  const progressTotal = el('b', '', '0');
  progress.append('Đã kiểm tra ', progressCount, ' / ', progressTotal, ' phím');
  const resetBtn = el('button', 'btn btn--ghost kbm__reset', 'Đặt lại');
  resetBtn.type = 'button';
  stats.append(progress, resetBtn);

  const modes = el('div', 'kbm__modes');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', 'Chế độ bố cục');
  const pcBtn = el('button', 'kbm__mode', 'PC');
  pcBtn.type = 'button';
  const macBtn = el('button', 'kbm__mode', 'MacBook');
  macBtn.type = 'button';
  modes.append(pcBtn, macBtn);

  bar.append(stats, modes);

  const mobileNotice = el(
    'p',
    'kbm__mobile',
    'Bài kiểm tra này dành cho máy tính có bàn phím. Bàn phím dưới đây chỉ hiển thị thu nhỏ để bạn xem qua.',
  );

  const notice = el('div', 'kbm__notice');
  notice.setAttribute('role', 'status');

  // ---- Bàn phím: các khối đặt cạnh nhau trên một hàng, co giãn theo khung chứa ----
  const stage = el('div', 'kbm__stage kbm__stage--pc');
  const kb = el('div', 'kb');
  const mainBlock = el('div', 'kb__main-block');
  const fnRow = el('div', 'kb-grid');
  const mainGrid = el('div', 'kb-grid');
  const mid = el('div', 'kb__mid');
  const navGrid = el('div', 'kb-grid kb__nav');
  const arrowGrid = el('div', 'kb-grid kb__arrows');
  const numpad = el('div', 'kb-grid kb__numpad');

  const setGrid = (grid: HTMLElement, units: number): void => {
    grid.style.setProperty('--units', String(units));
    grid.style.setProperty('--cols', String(Math.round(units * COLS_PER_UNIT)));
  };
  setGrid(fnRow, MAIN_UNITS);
  setGrid(mainGrid, MAIN_UNITS);
  setGrid(navGrid, NAV_UNITS);
  setGrid(arrowGrid, ARROW_UNITS);
  setGrid(numpad, NUMPAD_UNITS);

  /** Chỉ hiện ở một chế độ: CSS ẩn phần tử của chế độ còn lại. */
  const applyModeClass = (node: HTMLElement, k: KeyDef): void => {
    if (k.mode) node.classList.add(k.mode === 'pc' ? 'kb-key--pc-only' : 'kb-key--mac-only');
  };

  const makeKeyEl = (k: KeyDef, withShift = true, inStack = false): HTMLElement => {
    if (k.spacer) {
      const s = el('div', 'kb-key kb-key--spacer');
      applyModeClass(s, k);
      if (!inStack) {
        widthEls.push({ node: s, def: k });
        applyKeyWidth(s, k);
      }
      return s;
    }
    if (k.stack) {
      // Ô ▲/▼ xếp chồng của MacBook: một ô 1u chứa hai phím nửa chiều cao.
      const wrap = el('div', 'kb-key-stack');
      applyModeClass(wrap, k);
      widthEls.push({ node: wrap, def: k });
      applyKeyWidth(wrap, k);
      for (const sub of k.stack) wrap.appendChild(makeKeyEl(sub, false, true));
      return wrap;
    }
    const node = el('div', 'kb-key');
    applyModeClass(node, k);
    if (k.compactLabel) node.classList.add('kb-key--label-sm');
    if (!inStack) {
      widthEls.push({ node, def: k });
      applyKeyWidth(node, k);
    }
    if (k.decor) {
      // Phím có thật trên máy (fn) nhưng trình duyệt không báo sự kiện — chỉ để nhìn.
      node.classList.add('kb-key--decor');
      if (k.hint) node.title = k.hint;
      node.appendChild(el('span', 'kb-key__label', k.label));
      return node;
    }
    node.dataset.code = k.code;
    if (withShift && k.shift) node.appendChild(el('span', 'kb-key__shift', k.shift));
    node.appendChild(el('span', 'kb-key__label', k.label));
    registerKey(node, k.code);
    return node;
  };

  const makeNumpadKeyEl = (k: KeyDef): HTMLElement => {
    const node = el('div', 'kb-key');
    node.dataset.code = k.code;
    node.style.gridColumn = `${((k.col ?? 1) - 1) * COLS_PER_UNIT + 1} / span ${
      (k.width ?? 1) * COLS_PER_UNIT
    }`;
    node.style.gridRow = `${k.row} / span ${k.height ?? 1}`;
    node.appendChild(el('span', 'kb-key__label', k.label));
    registerKey(node, k.code);
    return node;
  };

  for (const k of functionRow) fnRow.appendChild(makeKeyEl(k, false));
  for (const row of mainRows) for (const k of row) mainGrid.appendChild(makeKeyEl(k));
  // Hàng dưới riêng của MacBook: chỉ hiện khi chọn chế độ MacBook.
  for (const k of macRowBottom) mainGrid.appendChild(makeKeyEl(k));
  for (const row of navCluster) for (const k of row) navGrid.appendChild(makeKeyEl(k, false));
  for (const row of arrowRows) for (const k of row) arrowGrid.appendChild(makeKeyEl(k, false));
  for (const k of numpadKeys) numpad.appendChild(makeNumpadKeyEl(k));

  mainBlock.append(fnRow, mainGrid);
  mid.append(navGrid, arrowGrid);
  kb.append(mainBlock, mid, numpad);
  stage.appendChild(kb);

  // ---- Khu vực thông tin phụ ----
  const meta = el('div', 'kbm__meta');
  const lockBox = el('div', 'kbm__locks');
  const lockChips: Record<keyof typeof locks, HTMLElement> = {
    CapsLock: el('span', 'kbm__lock', 'Caps Lock'),
    NumLock: el('span', 'kbm__lock', 'Num Lock'),
    ScrollLock: el('span', 'kbm__lock', 'Scroll Lock'),
  };
  lockBox.append(lockChips.CapsLock, lockChips.NumLock, lockChips.ScrollLock);

  const rollover = el('span', 'kbm__chip');
  const stuckChip = el('span', 'kbm__chip');
  meta.append(lockBox, rollover, stuckChip);

  const logBox = el('div', 'kbm__log');
  logBox.appendChild(el('h3', 'kbm__log-title', 'Nhật ký phím'));
  const logList = el('ol', 'kbm__log-list');
  logList.setAttribute('aria-live', 'polite');
  logBox.appendChild(logList);

  const hint = el(
    'p',
    'kbm__hint',
    'Một số phím như Fn, phím hệ thống (Windows/Cmd) hoặc tổ hợp bị hệ điều hành giữ lại có thể không bắt được — không tính là lỗi.',
  );

  root.append(bar, mobileNotice, notice, stage, meta, logBox, hint);
  container.appendChild(root);

  // ---- Hàm cập nhật ----
  const isVisible = (code: string): boolean => mode === 'pc' || !MAC_HIDDEN.has(code);

  const visibleTotal = (): number => {
    let n = 0;
    for (const code of codeEls.keys()) if (isVisible(code)) n++;
    return n;
  };

  const visibleCaptured = (): number => {
    let n = 0;
    for (const code of seen) if (isVisible(code) && codeEls.has(code)) n++;
    return n;
  };

  const applyState = (code: string, active: boolean): void => {
    const nodes = codeEls.get(code);
    if (!nodes) return;
    for (const node of nodes) {
      node.classList.toggle('is-active', active);
      node.classList.toggle('is-checked', seen.has(code));
    }
  };

  const refreshStats = (): void => {
    const total = visibleTotal();
    const captured = visibleCaptured();
    progressCount.textContent = String(captured);
    progressTotal.textContent = String(total);
    progress.classList.toggle('is-done', total > 0 && captured === total);
  };

  const refreshLocks = (): void => {
    (Object.keys(locks) as Array<keyof typeof locks>).forEach((name) => {
      lockChips[name].classList.toggle('is-on', locks[name]);
    });
  };

  const refreshRollover = (): void => {
    rollover.textContent = `Giữ cùng lúc: ${pressed.size}${
      pressed.size >= MAX_ROLLOVER_DISPLAY ? '+' : ''
    } · cao nhất ${maxRollover}`;
    if (stuck.size === 0) {
      stuckChip.textContent = 'Không phát hiện kẹt phím';
      stuckChip.classList.remove('is-bad');
    } else {
      stuckChip.textContent = `Nghi kẹt phím: ${[...stuck].join(', ')}`;
      stuckChip.classList.add('is-bad');
    }
  };

  const refreshLog = (): void => {
    logList.textContent = '';
    for (const entry of log) {
      const li = el('li', 'kbm__log-item');
      li.classList.toggle('is-up', entry.type === 'up');
      const t = Math.round(entry.at - startedAt);
      li.append(
        el('code', 'kbm__log-code', entry.code),
        el('span', 'kbm__log-key', entry.key === ' ' ? 'Space' : entry.key),
        el('span', 'kbm__log-time', `+${t} ms`),
      );
      logList.appendChild(li);
    }
  };

  const pushLog = (code: string, key: string, type: 'down' | 'up'): void => {
    log.unshift({ code, key, type, at: performance.now() });
    if (log.length > LOG_LIMIT) log.length = LOG_LIMIT;
    refreshLog();
  };

  // ---- Chế độ bố cục ----
  const applyMode = (): void => {
    const isPc = mode === 'pc';
    const units = isPc ? MAIN_UNITS : MAIN_UNITS_MAC;
    stage.classList.toggle('kbm__stage--pc', isPc);
    stage.classList.toggle('kbm__stage--mac', !isPc);
    kb.style.setProperty('--kb-total', String(TOTAL_UNITS[mode]));
    kb.style.setProperty('--kb-block-gap', String(BLOCK_GAP_UNITS));
    // Lưới phím chính hẹp lại ở MacBook, nên phải đặt lại số cột và bề rộng từng phím.
    setGrid(fnRow, units);
    setGrid(mainGrid, units);
    for (const { node, def } of widthEls) applyKeyWidth(node, def);
    pcBtn.classList.toggle('is-on', isPc);
    pcBtn.setAttribute('aria-pressed', String(isPc));
    macBtn.classList.toggle('is-on', !isPc);
    macBtn.setAttribute('aria-pressed', String(!isPc));
    refreshStats();
  };

  pcBtn.addEventListener('click', () => {
    mode = 'pc';
    applyMode();
  });
  macBtn.addEventListener('click', () => {
    mode = 'mac';
    applyMode();
  });

  // ---- Xử lý sự kiện bàn phím ----
  const onKeydown = (e: KeyboardEvent): void => {
    if (shouldPrevent(e)) e.preventDefault();
    const code = e.code;
    if (!code) return;

    if (ISO_CODES.has(code)) isoDetected = true;

    if (e.repeat) {
      const count = (repeatCounts.get(code) ?? 0) + 1;
      repeatCounts.set(code, count);
      if (count >= STUCK_REPEAT_THRESHOLD) stuck.add(code);
    }

    const wasPressed = pressed.has(code);
    seen.add(code);
    pressed.add(code);
    if (pressed.size > maxRollover) maxRollover = pressed.size;

    applyState(code, true);
    refreshStats();
    refreshRollover();
    if (!wasPressed || e.repeat) pushLog(code, e.key, 'down');

    locks = {
      CapsLock: e.getModifierState('CapsLock'),
      NumLock: e.getModifierState('NumLock'),
      ScrollLock: e.getModifierState('ScrollLock'),
    };
    refreshLocks();
    if (isoDetected) refreshNotice();
  };

  const onKeyup = (e: KeyboardEvent): void => {
    if (shouldPrevent(e)) e.preventDefault();
    const code = e.code;
    if (!code) return;
    pressed.delete(code);
    repeatCounts.delete(code);
    applyState(code, false);
    refreshRollover();
    pushLog(code, e.key, 'up');
  };

  const clearPressed = (): void => {
    const held = [...pressed];
    pressed.clear();
    repeatCounts.clear();
    for (const code of held) applyState(code, false);
    refreshRollover();
  };

  const onBlur = (): void => clearPressed();
  const onVisibility = (): void => {
    if (document.hidden) clearPressed();
  };

  window.addEventListener('keydown', onKeydown);
  window.addEventListener('keyup', onKeyup);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);

  resetBtn.addEventListener('click', () => {
    seen.clear();
    pressed.clear();
    stuck.clear();
    repeatCounts.clear();
    log.length = 0;
    maxRollover = 0;
    for (const nodes of codeEls.values()) {
      for (const node of nodes) node.classList.remove('is-active', 'is-checked');
    }
    refreshStats();
    refreshRollover();
    refreshLog();
  });

  // ---- Kiểm tra layout ----
  let typingBox: HTMLElement | null = null;
  const refreshNotice = (): void => {
    notice.textContent = '';
    notice.classList.remove('is-ok', 'is-warn');

    const addLine = (text: string, kind: 'ok' | 'warn' | 'info'): HTMLElement => {
      const p = el('p', `kbm__notice-line kbm__notice-line--${kind}`, text);
      notice.appendChild(p);
      return p;
    };

    if (isoDetected) {
      notice.classList.add('is-warn');
      addLine(
        'Bàn phím này không phải ANSI US: đã nhận phím ISO/JIS (IntlBackslash/IntlRo/IntlYen). Enter thường có hình chữ L và có phím thừa cạnh Shift trái.',
        'warn',
      );
    }

    if (!layoutReport) {
      addLine('Đang kiểm tra layout hệ thống…', 'info');
      return;
    }

    if (!layoutReport.supported) {
      addLine(
        'Trình duyệt này không hỗ trợ đọc layout hệ thống (thiếu getLayoutMap). Bạn có thể mở mục dưới đây để kiểm tra bằng cách gõ.',
        'info',
      );
      if (!typingBox) {
        typingBox = buildTypingBox();
        notice.appendChild(typingBox);
      }
      return;
    }

    if (layoutReport.isUs) {
      notice.classList.add('is-ok');
      addLine('Layout hệ thống là US ANSI. ✔', 'ok');
    } else {
      notice.classList.add('is-warn');
      const bad = layoutReport.entries.filter((e) => !e.ok);
      const detail = bad.map((e) => `${e.code}: “${e.actual ?? '?'}” (cần “${e.expected}”)`).join(' · ');
      addLine(`Layout hệ thống không phải US. ${detail}`, 'warn');
    }
  };

  const buildTypingBox = (): HTMLElement => {
    const details = el('details', 'kbm__typing');
    const summary = el('summary', 'kbm__typing-summary', 'Gõ dòng mẫu để kiểm tra layout');
    const body = el('div', 'kbm__typing-body');
    body.appendChild(el('p', 'kbm__typing-sample', `Dòng mẫu: ${TYPING_SAMPLE}`));
    const input = el('input', 'kbm__typing-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Gõ dòng mẫu tại đây…';
    input.setAttribute('aria-label', 'Ô gõ dòng mẫu kiểm tra layout');
    const result = el('p', 'kbm__typing-result');
    input.addEventListener('input', () => {
      const r = compareTyped(input.value);
      result.classList.remove('is-ok', 'is-warn');
      if (r.complete) {
        result.classList.add('is-ok');
        result.textContent = 'Khớp dòng mẫu — layout giống US. ✔';
      } else if (r.mismatches.length > 0) {
        const m = r.mismatches[0];
        result.classList.add('is-warn');
        result.textContent = `Ký tự ${m.index + 1} không khớp: nhận “${m.got}”, cần “${m.expected}”.`;
      } else {
        result.textContent = `Đã gõ ${r.typed}/${TYPING_SAMPLE.length} ký tự.`;
      }
    });
    body.append(input, result);
    details.append(summary, body);
    return details;
  };

  let layoutReport: Awaited<ReturnType<typeof checkUsLayout>> | null = null;
  refreshNotice();
  void checkUsLayout().then((report) => {
    layoutReport = report;
    refreshNotice();
  });

  // ---- Khởi tạo ----
  applyMode();
  refreshLocks();
  refreshRollover();
  refreshLog();

  // ---- Dọn dẹp ----
  return () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    pressed.clear();
    codeEls.clear();
    root.remove();
  };
}
