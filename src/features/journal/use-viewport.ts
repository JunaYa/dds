import { useEffect } from 'react';

export function useViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const style = document.documentElement.style;
    const update = () => {
      style.setProperty('--journal-viewport-height', `${viewport.height}px`);
      style.setProperty('--journal-viewport-top', `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      style.removeProperty('--journal-viewport-height');
      style.removeProperty('--journal-viewport-top');
    };
  }, []);
}
