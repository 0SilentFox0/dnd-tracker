// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OptionButton } from "@/components/hud/OptionButton";

afterEach(cleanup);

describe("OptionButton", () => {
  it("exposes role and aria-checked", () => {
    render(<OptionButton role="checkbox" checked title="Ліс" note="опис" onClick={() => {}} />);

    const el = screen.getByRole("checkbox", { name: /Ліс/ });

    expect(el.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("опис")).toBeTruthy();
  });

  it("activates through click and does not fire when disabled", () => {
    const onClick = vi.fn();

    const { rerender } = render(<OptionButton role="radio" checked={false} title="A" onClick={onClick} />);

    fireEvent.click(screen.getByRole("radio"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<OptionButton role="radio" checked={false} disabled title="A" onClick={onClick} />);
    fireEvent.click(screen.getByRole("radio"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
