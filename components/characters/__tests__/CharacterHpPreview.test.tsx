// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";

describe("CharacterHpPreview", () => {
  afterEach(cleanup);

  it("показує HP з листа (з бонусами) і його розкладку", () => {
    render(<CharacterHpPreview hp={{ total: 312, lines: [{ label: "= 30 × 10 × 1 = 300", value: "" }, { label: "Бонуси", value: "+12" }] }} />);

    expect(screen.getByText("312")).toBeTruthy();
    expect(screen.getByText("= 30 × 10 × 1 = 300")).toBeTruthy();
    expect(screen.getByText("Бонуси +12")).toBeTruthy();
  });
});
