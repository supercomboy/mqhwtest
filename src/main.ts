import './styles/tokens.css';
import './styles/main.css';
import { modules, type TestModule } from './modules/registry';

const grid = document.getElementById('tests');
const navLinks = document.getElementById('nav-links');

for (const m of modules) {
  if (grid) {
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.id = m.id;
    card.innerHTML = `<h2>${m.title}</h2><p>${m.description}</p><button class="btn btn--ghost" type="button" data-module="${m.id}">${m.actionLabel ?? 'Mở bài kiểm tra'}</button>`;
    grid.appendChild(card);
  }
  if (navLinks) {
    const a = document.createElement('a');
    a.href = `#${m.id}`;
    a.textContent = m.title;
    navLinks.appendChild(a);
  }
}

// Mở bài kiểm tra trong hộp thoại dùng chung (kính mờ kiểu Apple).
let closeActiveModal: (() => void) | null = null;

function openTest(m: TestModule): void {
  const mount = m.mount;
  if (!mount || closeActiveModal) return;

  const previousFocus = document.activeElement as HTMLElement | null;

  const overlay = document.createElement('div');
  overlay.className = 'modal';

  // Lớp nền làm mờ trang chủ phía sau tấm kính.
  const backdrop = document.createElement('div');
  backdrop.className = 'modal__backdrop';

  const panel = document.createElement('div');
  panel.className = 'modal__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', m.title);
  panel.tabIndex = -1;

  const head = document.createElement('div');
  head.className = 'modal__head';
  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = m.title;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal__close';
  closeBtn.setAttribute('aria-label', 'Đóng bài kiểm tra');
  closeBtn.textContent = '✕';
  head.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'modal__body';

  panel.append(head, body);
  overlay.append(backdrop, panel);
  document.body.append(overlay);
  document.body.classList.add('is-locked');

  const cleanup = mount(body);
  const focusables = () =>
    Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute('disabled'));

  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  closeActiveModal = () => {
    overlay.removeEventListener('keydown', onKeydown);
    overlay.removeEventListener('click', onOverlayClick);
    cleanup();
    overlay.remove();
    document.body.classList.remove('is-locked');
    closeActiveModal = null;
    previousFocus?.focus();
  };

  function onOverlayClick(e: MouseEvent): void {
    if (e.target === overlay || e.target === backdrop) closeActiveModal?.();
  }

  overlay.addEventListener('keydown', onKeydown);
  overlay.addEventListener('click', onOverlayClick);
  closeBtn.addEventListener('click', () => closeActiveModal?.());

  panel.focus();
}

if (grid) {
  grid.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-module]');
    if (!btn) return;
    const m = modules.find((x) => x.id === btn.dataset.module);
    if (!m) return;
    if (!m.mount) {
      btn.disabled = true;
      btn.title = 'Sắp có';
      return;
    }
    openTest(m);
  });
}

// Hiện dần khi cuộn (tắt nếu người dùng chọn giảm chuyển động)
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = document.querySelectorAll<HTMLElement>('.reveal');
if (reduce || !('IntersectionObserver' in window)) {
  items.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 },
  );
  items.forEach((el) => io.observe(el));
}
