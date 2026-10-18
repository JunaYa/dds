import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { SegmentControl } from "./segment-control";

afterEach(cleanup);

function Control() {
  const [value, setValue] = useState("all");
  return <SegmentControl variant="text" value={value} onValueChange={setValue}
    items={[{value:"today",label:"Today"},{value:"all",label:"All records"}]} />;
}

it("switches selection immediately and keeps one selected when clicked again", () => {
  render(<Control />);
  const today = screen.getByRole("button", {name:"Today"});
  fireEvent.pointerDown(today);
  fireEvent.click(today);
  expect(today).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", {name:"All records"})).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(today);
  expect(today).toHaveAttribute("aria-pressed", "true");
});

it("preserves keyboard navigation and activation", async () => {
  const user = userEvent.setup();
  render(<Control />);
  await user.click(screen.getByRole("button", {name:"All records"}));
  await user.keyboard("{ArrowLeft} ");
  expect(screen.getByRole("button", {name:"Today"})).toHaveFocus();
  expect(screen.getByRole("button", {name:"Today"})).toHaveAttribute("aria-pressed", "true");
});
