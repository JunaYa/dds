import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PageElasticity } from './page-elasticity'

let reduced = false
let mediaChanged: () => void

beforeEach(() => {
  reduced = false
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return reduced },
    addEventListener: (_: string, listener: () => void) => { mediaChanged = listener },
    removeEventListener: vi.fn(),
  })))
  Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 })
  vi.stubGlobal('innerHeight', 800)
  document.documentElement.scrollTop = 0
})

afterEach(() => vi.unstubAllGlobals())

function pull(target: Element, from: number, to: number, x = 100) {
  fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: from }] })
  return fireEvent.touchMove(target, { touches: [{ clientX: x, clientY: to }] })
}

function mount() {
  return render(<main><PageElasticity data-testid="content"><p>Content</p></PageElasticity></main>)
}

it('provides bounded pull feedback at both edges without cancelling native scrolling', async () => {
  mount()
  const content = screen.getByTestId('content')
  expect(pull(content, 100, 300)).toBe(true)
  expect(content.style.transform).toMatch(/translate3d\(0, 15\./)
  fireEvent.touchEnd(window, { touches: [] })
  await waitFor(() => expect(content.style.transform).toBe(''))
  document.documentElement.scrollTop = 1200
  expect(pull(content, 400, 100)).toBe(true)
  expect(content.style.transform).toMatch(/translate3d\(0, -17\./)
  fireEvent.touchCancel(window)
  expect(content.style.transform).toBe('')
})

it('leaves mid-page scrolling, horizontal gestures and mouse input untouched', () => {
  mount()
  const content = screen.getByTestId('content')
  document.documentElement.scrollTop = 500
  pull(content, 100, 300)
  expect(content.style.transform).toBe('')
  document.documentElement.scrollTop = 0
  pull(content, 100, 120, 300)
  expect(content.style.transform).toBe('')
  fireEvent.pointerDown(content, { pointerType: 'mouse', clientY: 100 })
  fireEvent.pointerMove(content, { pointerType: 'mouse', clientY: 400 })
  expect(content.style.transform).toBe('')
})

it('keeps nested scrollers, editable controls and fixed siblings independent', () => {
  render(<main><PageElasticity data-testid="content">
    <div style={{ overflowY: 'auto' }}><p>Nested</p></div>
    <input aria-label="Editable" />
  </PageElasticity><div data-testid="fixed">Fixed</div></main>)
  const content = screen.getByTestId('content')
  pull(screen.getByText('Nested'), 100, 300)
  expect(content.style.transform).toBe('')
  pull(screen.getByLabelText('Editable'), 100, 300)
  expect(content.style.transform).toBe('')
  pull(content, 100, 300)
  expect(content.style.transform).not.toBe('')
  expect(screen.getByTestId('fixed').style.transform).toBe('')
})

it('cancels for multitouch, navigation, overlays and reduced motion', () => {
  const view = mount()
  const content = screen.getByTestId('content')
  pull(content, 100, 300)
  fireEvent.touchMove(content, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 100 }] })
  expect(content.style.transform).toBe('')
  pull(content, 100, 300)
  act(() => { reduced = true; mediaChanged() })
  expect(content.style.transform).toBe('')
  pull(content, 100, 300)
  expect(content.style.transform).toBe('')
  reduced = false
  pull(content, 100, 300)
  view.rerender(<main><PageElasticity data-testid="content" resetKey="next">Content</PageElasticity></main>)
  expect(content.style.transform).toBe('')
  pull(content, 100, 300)
  view.rerender(<main><PageElasticity data-testid="content" enabled={false}>Content</PageElasticity></main>)
  expect(content.style.transform).toBe('')
})

it('can interrupt a return animation without snapping to rest', () => {
  mount()
  const content = screen.getByTestId('content')
  pull(content, 100, 300)
  const before = content.style.transform
  fireEvent.touchEnd(window)
  fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 300 }] })
  expect(content.style.transform).toBe(before)
  fireEvent.touchCancel(window)
  expect(content.style.transform).toBe('')
})

it('starts feedback when a native scroll reaches the edge and releases when direction reverses', async () => {
  mount()
  const content = screen.getByTestId('content')
  document.documentElement.scrollTop = 200
  fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 200 }] })
  expect(content.style.transform).toBe('')
  document.documentElement.scrollTop = 0
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 300 }] })
  expect(content.style.transform).not.toBe('')
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 250 }] })
  await waitFor(() => expect(content.style.transform).toBe(''))
  expect(document.documentElement.scrollTop).toBe(0)
})

it('returns smoothly instead of jumping to the opposite edge on a short page', async () => {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 600 })
  mount()
  const content = screen.getByTestId('content')
  pull(content, 100, 300)
  const before = content.style.transform
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 250 }] })
  expect(content.style.transform).toBe(before)
  await waitFor(() => expect(content.style.transform).toBe(''))
})

it('uses the WebView viewport when the root client height excludes native insets', () => {
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 704 })
  document.documentElement.scrollTop = 1200
  mount()
  const content = screen.getByTestId('content')
  pull(content, 400, 100)
  expect(content.style.transform).toContain('translate3d(0, -')
})
