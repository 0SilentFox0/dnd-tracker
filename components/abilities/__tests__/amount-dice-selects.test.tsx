// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AmountField, parseSimpleDice } from "@/components/abilities/fields/AmountField";
import type { LocalizedFieldMeta } from "@/lib/utils/abilities/registry/fields";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, options, onValueChange, ...rest }: { value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void; "aria-label"?: string }) => (
    <select aria-label={rest["aria-label"]} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

const meta = { name: "amount", label: "Amount", input: "amount" } as LocalizedFieldMeta;

describe("AmountField dice selects", () => {
  afterEach(cleanup);

  it("shows plain dice in two selects and emits new strings", () => {
    const emit = vi.fn();

    render(<AmountField id="a" meta={meta} value="2d8" onChange={emit} />);

    const count = screen.getByLabelText(/diceCount/) as HTMLSelectElement;

    const sides = screen.getByLabelText(/diceSides/) as HTMLSelectElement;

    expect(count.value).toBe("2");
    expect(sides.value).toBe("8");

    fireEvent.change(count, { target: { value: "5" } });
    expect(emit).toHaveBeenLastCalledWith("5d8");

    fireEvent.change(sides, { target: { value: "12" } });
    expect(emit).toHaveBeenLastCalledWith("2d12");
  });

  it.each(["2d6+3", "1d3", "abc", "25d6"])("keeps %s in the text input unchanged", (v) => {
    const emit = vi.fn();

    render(<AmountField id="a" meta={meta} value={v} onChange={emit} />);

    expect(screen.queryByLabelText(/diceCount/)).toBeNull();
    expect((screen.getAllByRole("textbox")[0] as HTMLInputElement).value).toBe(v);
    expect(emit).not.toHaveBeenCalled();
  });

  it("parseSimpleDice accepts only count 1-20 and listed dice", () => {
    expect(parseSimpleDice("1d100")).toEqual({ count: "1", sides: "100" });
    expect(parseSimpleDice("0d6")).toBeNull();
    expect(parseSimpleDice("1d6+1")).toBeNull();
  });
});
