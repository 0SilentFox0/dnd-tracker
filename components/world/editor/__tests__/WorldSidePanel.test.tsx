// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldSidePanel } from "../WorldSidePanel";

afterEach(cleanup);

describe("WorldSidePanel", () => {
  it("renders nothing when closed", () => {
    render(<WorldSidePanel open={false} onClose={vi.fn()}>content</WorldSidePanel>);

    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows content when open and closes on the button and on Esc", () => {
    const onClose = vi.fn();

    render(<WorldSidePanel open onClose={onClose}>content</WorldSidePanel>);

    expect(screen.getByText("content")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Закрити панель" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
