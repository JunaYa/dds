import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

export function useAlbumDrag(enabled: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const position = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  function move(left: number, top: number) {
    const button = ref.current, area = button?.offsetParent;
    if (!button || !(area instanceof HTMLElement)) return;
    const bounds = area.getBoundingClientRect();
    const size = button.getBoundingClientRect();
    const maxX = Math.max(0, bounds.width - (button.offsetWidth || size.width)), maxY = Math.max(0, bounds.height - (button.offsetHeight || size.height));
    const x = Math.max(0, Math.min(left, maxX)), y = Math.max(0, Math.min(top, maxY));
    button.style.left = `${x}px`; button.style.top = `${y}px`;
    button.style.right = "auto"; button.style.bottom = "auto";
    position.current = { x: maxX ? x / maxX : 0, y: maxY ? y / maxY : 0 };
  }
  useLayoutEffect(() => {
    if (!enabled || !ref.current?.offsetParent) return;
    const button = ref.current;
    const area = button.offsetParent as HTMLElement;
    const resize = () => {
      if (!position.current || button.hidden) return;
      const bounds = area.getBoundingClientRect(), size = button.getBoundingClientRect();
      move(position.current.x * Math.max(0, bounds.width - (button.offsetWidth || size.width)), position.current.y * Math.max(0, bounds.height - (button.offsetHeight || size.height)));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(area); observer.observe(button);
    return () => observer.disconnect();
  }, [enabled]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!enabled || event.button !== 0 || event.isPrimary === false || gesture.current) return;
    const area = event.currentTarget.offsetParent;
    if (!(area instanceof HTMLElement)) return;
    suppressClick.current = false;
    const bounds = area.getBoundingClientRect(), button = event.currentTarget.getBoundingClientRect();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: button.left - bounds.left, top: button.top - bounds.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(x, y) < 6) return;
    drag.moved = true; suppressClick.current = true;
    event.currentTarget.setAttribute("data-dragging", "");
    move(drag.left + x, drag.top + y);
  }
  function finish(event: ReactPointerEvent<HTMLButtonElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    event.currentTarget.removeAttribute("data-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return { ref, onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
    onClickCapture(event: ReactMouseEvent<HTMLButtonElement>) {
      if (enabled && suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    } };
}
