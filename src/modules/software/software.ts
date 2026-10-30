// Công cụ "Cài phần mềm": chọn app từ catalog tĩnh rồi tải một script PowerShell dùng winget.
// Không tự cài, không gọi mạng, không lưu lựa chọn — mọi thứ diễn ra trong tab này.
import './software.css';
import { apps, categories, validateCatalog, type SoftwareApp } from './catalog';
import { buildPowerShell, buildWingetOneLiner, SCRIPT_FILENAME } from './install-script';

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

/** Bỏ dấu tiếng Việt để tìm "zalo" vẫn ra "Zalo", "coc coc" ra "Cốc Cốc". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

interface AppCard {
  app: SoftwareApp;
  node: HTMLElement;
  input: HTMLInputElement | null;
}

export function mountSoftware(container: HTMLElement): () => void {
  const root = el('div', 'sw');

  const catalogErrors = validateCatalog();
  if (catalogErrors.length > 0) {
    console.error('[software] Catalog không hợp lệ:', catalogErrors);
    root.append(
      el(
        'p',
        'sw__notice',
        'Dữ liệu phần mềm đang không hợp lệ nên công cụ tạm thời không dùng được.',
      ),
    );
    container.append(root);
    return () => root.remove();
  }

  /** Các app đang được tick, lưu theo id trong catalog. */
  const selected = new Set<string>();
  let objectUrl: string | null = null;
  const siteUrl = new URL(import.meta.env.BASE_URL, window.location.href).href;

  const noticeEl = el('div', 'sw__notice');
  noticeEl.setAttribute('role', 'status');
  const notice = (message: string): void => {
    noticeEl.textContent = message;
  };

  const intro = el(
    'p',
    'sw__intro',
    'Chọn phần mềm bạn muốn cài. Trang sẽ tạo một file PowerShell dùng winget để cài tự động trên Windows — không cần cài thêm phần mềm nào và không có dữ liệu nào được gửi đi.',
  );

  // ---- Thanh công cụ ----
  const search = el('input', 'sw__search');
  search.type = 'search';
  search.placeholder = 'Tìm phần mềm…';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-label', 'Tìm phần mềm');

  const presetBtn = el('button', 'btn btn--ghost sw__preset', 'Chọn bộ cơ bản');
  presetBtn.type = 'button';
  const clearBtn = el('button', 'btn btn--ghost sw__clear', 'Bỏ chọn tất cả');
  clearBtn.type = 'button';

  const toolbar = el('div', 'sw__toolbar');
  toolbar.append(search, presetBtn, clearBtn);

  const countEl = el('p', 'sw__count');
  countEl.setAttribute('aria-live', 'polite');

  // ---- Danh sách app ----
  const list = el('div', 'sw__list');
  list.tabIndex = 0;
  list.setAttribute('role', 'region');
  list.setAttribute('aria-label', 'Danh sách phần mềm');

  const cards: AppCard[] = [];
  const sections: Array<{ node: HTMLElement; cards: AppCard[] }> = [];

  const buildCard = (app: SoftwareApp): AppCard => {
    const node = el('div', 'sw-app');
    node.dataset.app = app.id;

    const main = el('label', 'sw-app__main');
    let input: HTMLInputElement | null = null;
    if (app.wingetId) {
      input = el('input', 'sw-app__check');
      input.type = 'checkbox';
      input.value = app.id;
      input.setAttribute('aria-label', `Chọn ${app.name}`);
      main.append(input);
    }

    const text = el('span', 'sw-app__text');
    const head = el('span', 'sw-app__head');
    head.append(el('span', 'sw-app__name', app.name));
    if (app.recommended) head.append(el('span', 'sw-app__badge', 'Cơ bản'));
    if (!app.wingetId) head.append(el('span', 'sw-app__badge', 'Tải thủ công'));
    text.append(
      head,
      el('span', 'sw-app__publisher', app.publisher),
      el('span', 'sw-app__desc', app.description),
    );
    if (app.note) text.append(el('span', 'sw-app__note', app.note));
    main.append(text);
    node.append(main);

    const link = el('a', 'sw-app__link', 'Trang chủ');
    link.href = app.homepage;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Trang chủ ${app.name}`);
    node.append(link);

    return { app, node, input };
  };

  for (const category of categories) {
    const categoryApps = apps.filter((app) => app.category === category.id);
    if (categoryApps.length === 0) continue;

    const section = el('section', 'sw-cat');
    const grid = el('div', 'sw-cat__grid');
    const sectionCards: AppCard[] = [];

    for (const app of categoryApps) {
      const card = buildCard(app);
      grid.append(card.node);
      cards.push(card);
      sectionCards.push(card);
    }

    section.append(el('h3', 'sw-cat__title', category.label), grid);
    list.append(section);
    sections.push({ node: section, cards: sectionCards });
  }

  const emptyEl = el('p', 'sw__empty', 'Không tìm thấy phần mềm phù hợp.');
  emptyEl.hidden = true;
  list.append(emptyEl);

  // ---- Hành động ----
  const downloadBtn = el('button', 'btn sw__download', 'Tải script (.ps1)');
  downloadBtn.type = 'button';
  downloadBtn.disabled = true;
  const copyBtn = el('button', 'btn btn--ghost sw__copy', 'Sao chép lệnh');
  copyBtn.type = 'button';
  copyBtn.disabled = true;

  const actions = el('div', 'sw__actions');
  actions.append(downloadBtn, copyBtn);

  const actionHint = el(
    'p',
    'sw__hint',
    'File .ps1 chỉ chứa lệnh cài đặt từ danh mục. Bạn có thể mở “Xem trước script” để đọc trước khi chạy.',
  );

  // ---- Xem trước ----
  const preview = el('details', 'sw__preview');
  const previewCode = el('pre', 'sw__code');
  preview.append(el('summary', 'sw__summary', 'Xem trước script'), previewCode);

  // ---- Ghi chú ----
  const notes = el('div', 'sw__notes');
  const noteLines = [
    'Script chỉ chạy trên Windows 10 1809+ hoặc Windows 11 có winget (App Installer).',
    'Trang không tự cài gì. Bạn tải file, xem trước nội dung, rồi tự chạy.',
    'Một số app sẽ hỏi quyền quản trị (UAC). Nếu Windows cảnh báo file .ps1 mới tải, mở Properties → Unblock hoặc chạy lệnh kèm -ExecutionPolicy Bypass.',
    'Chỉ cài bản miễn phí từ kho winget chính thức. WinRAR là bản dùng thử; TeamViewer miễn phí cho mục đích cá nhân.',
    'Chạy lại script để cập nhật: winget tự bỏ qua app đã ở bản mới nhất.',
  ];
  for (const line of noteLines) notes.append(el('p', 'sw__note', line));

  root.append(intro, noticeEl, toolbar, countEl, actions, list, actionHint);
  // Xem trước và ghi chú nằm trong vùng cuộn để thanh hành động luôn hiển thị.
  list.append(preview, notes);
  container.append(root);

  // ---- Trạng thái ----
  const chosenApps = (): SoftwareApp[] => apps.filter((app) => selected.has(app.id));

  const updatePreview = (): void => {
    if (!preview.open) return;
    const chosen = chosenApps();
    previewCode.textContent =
      chosen.length > 0
        ? buildPowerShell(chosen, { siteUrl })
        : 'Chọn ít nhất một phần mềm để xem script.';
  };

  const sync = (): void => {
    countEl.textContent = `Đã chọn ${selected.size} phần mềm`;
    const hasSelection = selected.size > 0;
    downloadBtn.disabled = !hasSelection;
    copyBtn.disabled = !hasSelection;
    for (const card of cards) {
      const isSelected = selected.has(card.app.id);
      card.node.classList.toggle('is-selected', isSelected);
      if (card.input) card.input.checked = isSelected;
    }
    updatePreview();
  };

  const applyFilter = (): void => {
    const query = normalize(search.value.trim());
    let visible = 0;

    for (const section of sections) {
      let sectionVisible = 0;
      for (const card of section.cards) {
        const haystack = normalize(
          `${card.app.name} ${card.app.publisher} ${card.app.description} ${card.app.note ?? ''}`,
        );
        const match = query === '' || haystack.includes(query);
        card.node.hidden = !match;
        if (match) {
          sectionVisible += 1;
          visible += 1;
        }
      }
      section.node.hidden = sectionVisible === 0;
    }

    emptyEl.hidden = visible > 0;
  };

  const selectOnly = (ids: Iterable<string>): void => {
    selected.clear();
    for (const id of ids) selected.add(id);
    sync();
  };

  // ---- Sự kiện ----
  list.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    if (target.checked) selected.add(target.value);
    else selected.delete(target.value);
    sync();
  });

  search.addEventListener('input', applyFilter);

  presetBtn.addEventListener('click', () => {
    search.value = '';
    applyFilter();
    selectOnly(
      apps.filter((app) => app.recommended && app.wingetId).map((app) => app.id),
    );
    notice(`Đã chọn ${selected.size} phần mềm cơ bản.`);
  });

  clearBtn.addEventListener('click', () => {
    search.value = '';
    applyFilter();
    selectOnly([]);
    notice('');
  });

  const copyText = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Rơi xuống phương án dự phòng.
    }

    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch {
      return false;
    }
  };

  downloadBtn.addEventListener('click', () => {
    const chosen = chosenApps();
    if (chosen.length === 0) return;

    try {
      const script = buildPowerShell(chosen, { siteUrl });
      const blob = new Blob(['\uFEFF', script], {
        type: 'text/plain;charset=utf-8',
      });
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = SCRIPT_FILENAME;
      document.body.append(link);
      link.click();
      link.remove();

      notice(`Đã tạo ${SCRIPT_FILENAME} cho ${chosen.length} phần mềm.`);
    } catch {
      notice('Không tạo được file script. Hãy thử lại.');
    }
  });

  copyBtn.addEventListener('click', () => {
    const chosen = chosenApps();
    if (chosen.length === 0) return;
    const command = buildWingetOneLiner(chosen);
    void copyText(command).then((ok) => {
      notice(
        ok
          ? `Đã sao chép lệnh cho ${chosen.length} phần mềm.`
          : 'Trình duyệt không cho sao chép. Hãy mở “Xem trước script” và sao chép thủ công.',
      );
    });
  });

  preview.addEventListener('toggle', updatePreview);

  // ---- Khởi tạo ----
  sync();
  applyFilter();

  // ---- Dọn dẹp ----
  return () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    root.remove();
  };
}
