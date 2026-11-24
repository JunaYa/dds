import { fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import { installFocusModality } from './focus-modality';

it('retains pointer modality through focus restoration and restores keyboard cues on Tab', () => {
  const cleanup = installFocusModality(document);
  const button = document.createElement('button');
  document.body.append(button);
  fireEvent.pointerDown(button, { pointerType: 'touch' });
  button.focus();
  expect(document.documentElement.dataset.inputModality).toBe('pointer');
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: 'Shift' });
  expect(document.documentElement.dataset.inputModality).toBe('pointer');
  fireEvent.keyDown(button, { key: 'Tab' });
  expect(document.documentElement.dataset.inputModality).toBe('keyboard');
  fireEvent.touchStart(button);
  expect(document.documentElement.dataset.inputModality).toBe('pointer');
  cleanup();
  button.remove();
  expect(document.documentElement).not.toHaveAttribute('data-input-modality');
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(document.documentElement).not.toHaveAttribute('data-input-modality');
});
