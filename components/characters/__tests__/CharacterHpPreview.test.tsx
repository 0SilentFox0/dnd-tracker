// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";

describe("CharacterHpPreview", () => {
  afterEach(cleanup);

  it("показує HP з листа (з бонусами) і його розкладку", () => {
    render(<CharacterHpPreview hp={{ total: 312, lines: [{ label: "= 30 × 10 × 1 = 300", value: "" }, { label: "Бонуси", value: "+12" }] }} coefficient={1} onCoefficientChange={vi.fn()} />);

    expect(screen.getByText("312")).toBeTruthy();
    expect(screen.getByText("= 30 × 10 × 1 = 300")).toBeTruthy();
    expect(screen.getByText("Бонуси +12")).toBeTruthy();
  });

  it("коефіцієнт у межах 0.1–3", () => {
    const onChange = vi.fn();

    render(<CharacterHpPreview hp={{ total: 300, lines: [] }} coefficient={1} onCoefficientChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Коефіцієнт HP"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("Коефіцієнт HP"), { target: { value: "9" } });

    expect(onChange.mock.calls).toEqual([[1.5]]);
  });
});
