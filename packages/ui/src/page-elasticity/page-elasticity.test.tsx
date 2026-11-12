import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PageElasticity } from './page-elasticity'
import { animate } from 'motion'

vi.mock('motion', async importOriginal => {
  const original = await importOriginal<typeof import('motion')>()
  return { ...original, animate: vi.fn(original.animate) }
})

let reduced = false
let mediaChanged: () => void

beforeEach(() => {
  reduced = false
  vi.mocked(animate).mockClear()
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

function displacement(element: HTMLElement) {
  return Number.parseFloat(element.style.transform.split(',')[1]) || 0
}

function timedTouch(target: Element, type: string, y: number, time: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' ? [] : [{ clientX: 100, clientY: y }] },
    timeStamp: { value: time },
  })
  fireEvent(target, event)
}

function releaseVelocity() {
  const options = vi.mocked(animate).mock.calls.at(-1)?.[2]
  return options && 'velocity' in options && typeof options.velocity === 'number' ? options.velocity : 0
}

it('provides bounded pull feedback at both edges without cancelling native scrolling', async () => {
  mount()
  const content = screen.getByTestId('content')
  expect(pull(content, 100, 300)).toBe(true)
  expect(displacement(content)).toBeGreaterThan(20)
  expect(displacement(content)).toBeLessThanOrEqual(36)
  fireEvent.touchEnd(window, { touches: [] })
  await waitFor(() => expect(content.style.transform).toBe(''))
  document.documentElement.scrollTop = 1200
  expect(pull(content, 400, 100)).toBe(true)
  expect(displacement(content)).toBeLessThan(-20)
  expect(displacement(content)).toBeGreaterThanOrEqual(-36)
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

it('keeps following a reversal and can pull again without lifting the finger', () => {
  mount()
  const content = screen.getByTestId('content')
  document.documentElement.scrollTop = 200
  fireEvent.touchStart(content, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 200 }] })
  expect(content.style.transform).toBe('')
  document.documentElement.scrollTop = 0
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 300 }] })
  expect(content.style.transform).not.toBe('')
  const before = displacement(content)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 250 }] })
  expect(displacement(content)).toBeGreaterThan(0)
  expect(displacement(content)).toBeLessThan(before)
  expect(animate).not.toHaveBeenCalled()
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 180 }] })
  expect(displacement(content)).toBe(0)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 280 }] })
  expect(displacement(content)).toBeGreaterThan(0)
  expect(document.documentElement.scrollTop).toBe(0)
})

it('consumes the existing pull before changing edges on a short page', () => {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 600 })
  mount()
  const content = screen.getByTestId('content')
  pull(content, 100, 300)
  const before = displacement(content)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 250 }] })
  expect(displacement(content)).toBeGreaterThan(0)
  expect(displacement(content)).toBeLessThan(before)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 20 }] })
  expect(displacement(content)).toBe(0)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 0 }] })
  expect(displacement(content)).toBeLessThan(0)
  expect(animate).not.toHaveBeenCalled()
})

it('uses the WebView viewport when the root client height excludes native insets', () => {
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 704 })
  document.documentElement.scrollTop = 1200
  mount()
  const content = screen.getByTestId('content')
  pull(content, 400, 100)
  expect(content.style.transform).toContain('translate3d(0, -')
})

it('adapts resistance to the viewport and gets heavier with longer pulls', () => {
  vi.stubGlobal('innerHeight', 500)
  mount()
  const content = screen.getByTestId('content')
  pull(content, 100, 120)
  const short = displacement(content)
  fireEvent.touchMove(content, { touches: [{ clientX: 100, clientY: 140 }] })
  expect(displacement(content) - short).toBeLessThan(short)
  pull(content, 100, 300)
  const smallViewport = displacement(content)
  expect(smallViewport).toBeLessThanOrEqual(24)
  vi.stubGlobal('innerHeight', 1000)
  fireEvent.resize(window)
  pull(content, 100, 300)
  expect(displacement(content)).toBeGreaterThan(smallViewport)
  expect(displacement(content)).toBeLessThanOrEqual(40)
})

it.each([1, -1])('hands recent velocity to the spring and discards a held release at edge %i', direction => {
  document.documentElement.scrollTop = direction === 1 ? 0 : 1200
  mount()
  const content = screen.getByTestId('content')
  timedTouch(content, 'touchstart', 400, 100)
  timedTouch(content, 'touchmove', 400 + 30 * direction, 116)
  timedTouch(content, 'touchmove', 400 + 60 * direction, 132)
  timedTouch(content, 'touchend', 400 + 60 * direction, 148)
  expect(releaseVelocity() * direction).toBeGreaterThan(0)
  expect(Math.abs(releaseVelocity())).toBeLessThanOrEqual(450)
  fireEvent.touchCancel(window)
  timedTouch(content, 'touchstart', 400, 300)
  timedTouch(content, 'touchmove', 400 + 150 * direction, 316)
  timedTouch(content, 'touchmove', 400 + 120 * direction, 332)
  timedTouch(content, 'touchmove', 400 + 90 * direction, 348)
  timedTouch(content, 'touchend', 400 + 90 * direction, 360)
  expect(releaseVelocity() * direction).toBeLessThan(0)
  fireEvent.touchCancel(window)
  timedTouch(content, 'touchstart', 400, 500)
  timedTouch(content, 'touchmove', 400 + 150 * direction, 516)
  timedTouch(content, 'touchend', 400 + 150 * direction, 800)
  expect(releaseVelocity()).toBe(0)
})

it.each([1, -1])('keeps a fast release bounded and settles without crossing rest at edge %i', async direction => {
  document.documentElement.scrollTop = direction === 1 ? 0 : 1200
  mount()
  const content = screen.getByTestId('content')
  const samples: number[] = []
  const observer = new MutationObserver(() => samples.push(displacement(content)))
  observer.observe(content, { attributes: true, attributeFilter: ['style'] })
  try {
    timedTouch(content, 'touchstart', 400, 100)
    timedTouch(content, 'touchmove', 400 + 300 * direction, 101)
    timedTouch(content, 'touchend', 400 + 300 * direction, 102)
    await waitFor(() => expect(content.style.transform).toBe(''))
    expect(samples.length).toBeGreaterThan(2)
    expect(samples.every(value => value * direction >= 0 && Math.abs(value) <= 36)).toBe(true)
  } finally { observer.disconnect() }
})
