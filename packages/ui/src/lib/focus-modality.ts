/** Keeps restored/programmatic focus in the modality that initiated the action. */
export function installFocusModality(document: Document): () => void {
  const root = document.documentElement;
  const previous = root.getAttribute('data-input-modality');
  const pointer = () => { root.dataset.inputModality = 'pointer'; };
  const keyboard = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || event.ctrlKey ||
      ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
    root.dataset.inputModality = 'keyboard';
  };
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('touchstart', pointer, { capture: true, passive: true });
  document.addEventListener('keydown', keyboard, true);
  return () => {
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('touchstart', pointer, true);
    document.removeEventListener('keydown', keyboard, true);
    if (previous === null) root.removeAttribute('data-input-modality');
    else root.setAttribute('data-input-modality', previous);
  };
}
