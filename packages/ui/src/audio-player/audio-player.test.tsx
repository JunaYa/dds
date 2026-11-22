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
