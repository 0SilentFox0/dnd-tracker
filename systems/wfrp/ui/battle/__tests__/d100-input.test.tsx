// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { D100Input } from "../D100Input";

import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

const rollButton = () => screen.getByRole("button", { name: "Кинути" });

describe("D100Input", () => {
  afterEach(cleanup);

  it("00 + 0 rolls 100", () => {
    const onRoll = vi.fn();

    render(<D100Input onRoll={onRoll} />);
    fireEvent.click(screen.getByRole("button", { name: "00" }));
    fireEvent.click(within0());
    fireEvent.click(rollButton());
    expect(onRoll).toHaveBeenCalledWith(100);
  });

  it("is disabled for an incomplete pair", () => {
    render(<D100Input onRoll={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "40" }));
    expect(rollButton()).toBeDisabled();
  });

  it.each([
    ["100", 100],
    ["0", undefined],
  ])("fallback field %s", (raw, expected) => {
    const onRoll = vi.fn();

    render(<D100Input onRoll={onRoll} />);
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: raw } });

    if (expected === undefined) {
      expect(rollButton()).toBeDisabled();
    } else {
      fireEvent.click(rollButton());
      expect(onRoll).toHaveBeenCalledWith(expected);
    }
  });

  it("pair 4 + 7 rolls 47", () => {
    const onRoll = vi.fn();

    render(<D100Input onRoll={onRoll} />);
    fireEvent.click(screen.getByRole("button", { name: "40" }));
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(rollButton());
    expect(onRoll).toHaveBeenCalledWith(47);
  });

  it("fallback field highlights the pair and clearing resets it", () => {
    render(<D100Input onRoll={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "40" }));
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "73" } });
    expect(screen.getByRole("button", { name: "70" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "40" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "" } });
    expect(screen.getByRole("button", { name: "70" })).toHaveAttribute("aria-pressed", "false");
    expect(rollButton()).toBeDisabled();
  });

  it("fallback field ignores 101", () => {
    render(<D100Input onRoll={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("1–100"), { target: { value: "101" } });
    expect(rollButton()).toBeDisabled();
  });
});

function within0() {
  return screen.getByRole("group", { name: "Одиниці" }).querySelector("button") as HTMLButtonElement;
}
