// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlayerViewToggle } from "@/components/common/PlayerViewToggle";

afterEach(cleanup);

const labels = { on: "Player view: on", off: "Player view: off" };

describe("PlayerViewToggle", () => {
  it("reflects state via aria-pressed and label, with the hotkey in the title", () => {
    const { rerender } = render(<PlayerViewToggle enabled={false} onToggle={vi.fn()} labels={labels} />);

    const button = screen.getByRole("button", { name: labels.off });

    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("title")).toContain("P");

    rerender(<PlayerViewToggle enabled onToggle={vi.fn()} labels={labels} />);

    expect(screen.getByRole("button", { name: labels.on }).getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onToggle on click", () => {
    const onToggle = vi.fn();

    render(<PlayerViewToggle enabled={false} onToggle={onToggle} labels={labels} />);
    fireEvent.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
