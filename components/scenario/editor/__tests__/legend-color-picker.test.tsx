// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LegendColorPicker } from "@/components/scenario/editor/LegendColorPicker";

afterEach(cleanup);

describe("LegendColorPicker", () => {
  it("marks the current colour and reports the picked one", () => {
    const onChange = vi.fn();

    render(<LegendColorPicker value="token" onChange={onChange} />);

    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(screen.getByRole("radio", { name: "Зелений" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "Золотий" }));

    expect(onChange).toHaveBeenCalledWith("artifact");
  });
});
