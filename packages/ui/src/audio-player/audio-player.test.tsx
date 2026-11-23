import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlbumButton, AudioControls, LyricsView } from "./audio-player";
describe("audio controls", () => {
  it("keeps a seek draft until committed instead of fighting incoming progress", () => {
    const seek = vi.fn();
    const props = { title: "Moon", playing: true, buffering: false, position: 10, duration: 100,
      onPlay: vi.fn(), onPause: vi.fn(), onSeek: seek, labels: { play: "Play", pause: "Pause", seek: "Seek", buffering: "Buffering" } };
    const view = render(<AudioControls {...props} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "40" } });
    view.rerender(<AudioControls {...props} position={11} />);
    expect(slider).toHaveValue("40");
    expect(seek).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(seek).toHaveBeenCalledWith(40);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(props.onPause).toHaveBeenCalledOnce();
  });
  it("exposes active lyrics without treating lyrics as HTML", () => {
    const seek = vi.fn();
    render(<LyricsView cues={[{ start: 1, text: "<script>words</script>" }]} active={0} onSeek={seek} emptyLabel="No lyrics" followLabel="Follow" />);
    const line = screen.getByRole("button", { name: "<script>words</script>" });
    expect(line).toHaveAttribute("aria-current", "true");
    fireEvent.click(line); expect(seek).toHaveBeenCalledWith(1);
  });
});

it("keeps the album entry accessible across playback states and falls back when artwork fails", () => {
  const open = vi.fn();
  const props = { artwork: "https://example.com/cover.jpg", label: "Open player", description: "Moon · Playing", onClick: open };
  const view = render(<AlbumButton {...props} status="playing" />);
  const button = screen.getByRole("button", { name: "Open player" });
  expect(button).toHaveAccessibleDescription("Moon · Playing");
  expect(button).toHaveAttribute("data-state", "playing");
  fireEvent.click(button); expect(open).toHaveBeenCalledOnce();
  for (const status of ["paused", "buffering", "error", "idle"] as const) {
    view.rerender(<AlbumButton {...props} status={status} />);
    expect(button).toHaveAttribute("data-state", status);
  }
  fireEvent.error(view.container.querySelector("img")!);
  expect(view.container.querySelector("img")).toBeNull();
  view.rerender(<AlbumButton {...props} artwork="https://example.com/new.jpg" status="playing" />);
  expect(view.container.querySelector("img")).toHaveAttribute("src", "https://example.com/new.jpg");
});

it("drags within its floating area without opening the player, and keeps taps and keyboard clicks working", () => {
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number; isPrimary: boolean;
    constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 1; this.isPrimary = options.isPrimary ?? true; }
  });
  const open = vi.fn();
  const view = render(<div><AlbumButton draggable status="paused" label="Move player" description="Moon" onClick={open} /></div>);
  const button = screen.getByRole("button", { name: "Move player" });
  const area = button.parentElement!;
  Object.defineProperty(button, "offsetParent", { configurable: true, value: area });
  vi.spyOn(area, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 300, height: 400 } as DOMRect);
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, width: 64, height: 64 } as DOMRect);
  button.setPointerCapture = vi.fn(); button.hasPointerCapture = vi.fn().mockReturnValue(true); button.releasePointerCapture = vi.fn();
  try {
    fireEvent.pointerDown(button, { pointerId: 1, button: 0, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(button, { pointerId: 1, clientX: 1000, clientY: 1000 });
    expect(button.style.left).toBe("236px"); expect(button.style.top).toBe("336px");
    fireEvent.pointerUp(button, { pointerId: 1 }); fireEvent.click(button, { detail: 1 });
    expect(open).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(button, { pointerId: 2, button: 0, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 122, clientY: 122 });
    fireEvent.pointerUp(button, { pointerId: 2 }); fireEvent.click(button, { detail: 1 });
    expect(open).toHaveBeenCalledOnce();
    fireEvent.pointerDown(button, { pointerId: 3, button: 0, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(button, { pointerId: 3, clientX: -1000, clientY: -1000 });
    expect(button.style.left).toBe("0px"); expect(button.style.top).toBe("0px");
    fireEvent.pointerCancel(button, { pointerId: 3 });
    expect(button).not.toHaveAttribute("data-dragging");
    fireEvent.click(button, { detail: 0 }); expect(open).toHaveBeenCalledTimes(2);
  } finally { view.unmount(); vi.unstubAllGlobals(); }
});
