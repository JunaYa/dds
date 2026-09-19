import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { RollingTime } from "./RollingTime";

it("keeps the readable time correct across a carry and a switch to a shorter timer", () => {
  const view = render(<RollingTime seconds={599} />);
  expect(screen.getByText("9:59")).toBeInTheDocument();
  view.rerender(<RollingTime seconds={600} />);
  expect(screen.getByText("10:00")).toBeInTheDocument();
  view.rerender(<RollingTime seconds={0} />);
  expect(screen.getByText("0:00")).toBeInTheDocument();
  expect(screen.queryByText("10:00")).not.toBeInTheDocument();
});
