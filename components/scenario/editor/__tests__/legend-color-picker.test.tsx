// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { render } from "@/components/scenario/__tests__/uk-intl";
import { LegendColorPicker } from "@/components/scenario/editor/LegendColorPicker";

afterEach(cleanup);

vi.unmock("next-intl");

describe("LegendColorPicker", () => {
  it("starts from the kind colour and reports any picked colour", () => {
    const onChange = vi.fn();

    render(<LegendColorPicker entry={{ kind: "token", label: "Жетон" }} onChange={onChange} />);

    const input = screen.getByLabelText("Колір позначки") as HTMLInputElement;

    expect(input.value).toBe("#79b8a4");

    fireEvent.input(input, { target: { value: "#ff00aa" } });

    expect(onChange).toHaveBeenCalledWith("#ff00aa");
  });

  it("shows a saved custom colour", () => {
    render(<LegendColorPicker entry={{ kind: "read", label: "Х", color: "#123456" }} onChange={vi.fn()} />);

    expect((screen.getByLabelText("Колір позначки") as HTMLInputElement).value).toBe("#123456");
  });
});
