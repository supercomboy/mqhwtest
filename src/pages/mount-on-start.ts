// Tạo nút "Bắt đầu test" và chỉ mount module khi bấm.
// Dùng cho bàn phím: tránh chặn phím tắt trình duyệt trong khi người dùng đang đọc.
export function mountOnStart(
  container: HTMLElement,
  label: string,
  mount: (c: HTMLElement) => () => void,
): () => void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn';
  btn.textContent = label;
  container.appendChild(btn);

  let cleanup: (() => void) | null = null;
  let mounted = false;

  btn.addEventListener('click', () => {
    if (mounted) return;
    mounted = true;
    btn.hidden = true;
    const inner = document.createElement('div');
    container.appendChild(inner);
    cleanup = mount(inner);
  });

  return () => {
    cleanup?.();
  };
}
