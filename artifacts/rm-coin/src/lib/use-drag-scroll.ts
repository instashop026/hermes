import { useEffect, useRef } from 'react';

/**
 * Drag-to-scroll for any overflow-auto element (Instagram story style).
 * Works on whichever axis is scrollable; cancels the click that follows a drag
 * so links inside the row don't fire when the user was really scrolling.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let down = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;

    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (el.scrollWidth > el.clientWidth) el.scrollLeft = startLeft - dx;
      if (el.scrollHeight > el.clientHeight) el.scrollTop = startTop - dy;
    };
    const onUp = () => {
      down = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = el.scrollLeft;
      startTop = el.scrollTop;
      // Track on window (not pointer-capture) so the click still lands on the
      // inner <a>/<button> — capture would redirect the click to this element.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClickCapture, true);
    el.style.cursor = 'grab';
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);
  return ref;
}

/** Phone-like vertical drag on the whole window (desktop mouse), ignoring interactive targets. */
export function useWindowDragScroll() {
  useEffect(() => {
    let down = false;
    let startY = 0;
    let startTop = 0;
    let moved = false;
    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element && Boolean(t.closest('button,a,input,textarea,select,video,img,[data-no-drag]'));

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      down = true;
      moved = false;
      startY = e.clientY;
      startTop = window.scrollY;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) {
        moved = true;
        document.body.style.userSelect = 'none';
      }
      window.scrollTo(0, startTop - dy);
    };
    const onUp = () => {
      down = false;
      document.body.style.userSelect = '';
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('click', onClickCapture, true);
    };
  }, []);
}
