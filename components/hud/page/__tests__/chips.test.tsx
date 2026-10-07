// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HudPill, HudStatChip } from "@/components/hud/page";

afterEach(cleanup);

describe("HudStatChip", () => {
  it("shows the value and the short caption, with an optional accessible label", () => {
    render(<HudStatChip short="AC" value={15} label="Клас броні" />);

    const chip = screen.getByLabelText("Клас броні");

    expect(chip.textContent).toBe("15AC");
  });
});

describe("HudPill", () => {
  it("renders metal tones with the metal-fill class", () => {
    render(<HudPill tone="gold">Активний</HudPill>);

    expect(screen.getByText("Активний").className).toContain("metal-gold");
    expect(screen.getByText("Активний").className).toContain("metal-fill");
  });

  it("renders an icon before the text", () => {
    render(<HudPill icon={<i data-testid="ico" />}>AoE</HudPill>);

    expect(screen.getByText("AoE").firstElementChild?.getAttribute("data-testid")).toBe("ico");
  });
});
