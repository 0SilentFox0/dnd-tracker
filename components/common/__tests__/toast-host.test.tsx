// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastHost } from "@/components/common/ToastHost";

afterEach(cleanup);

describe("ToastHost", () => {
  it("renders text and link", () => {
    render(<ToastHost toasts={[{ id: "a", text: "Новий предмет", href: "/x" }]} onDismiss={vi.fn()} />);

    expect(screen.getByText("Новий предмет")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/x");
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("dismisses via the close button and via the link", () => {
    const onDismiss = vi.fn();

    render(<ToastHost toasts={[{ id: "a", text: "T", href: "/x" }]} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "common.ui.close" }));
    expect(onDismiss).toHaveBeenCalledWith("a");

    onDismiss.mockClear();
    fireEvent.click(screen.getByRole("link"));
    expect(onDismiss).toHaveBeenCalledWith("a");
  });

  it("renders no container when empty", () => {
    const { container } = render(<ToastHost toasts={[]} onDismiss={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });
});
