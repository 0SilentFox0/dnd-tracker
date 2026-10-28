// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnitFiveEFields } from "@/components/units/form/UnitFiveEFields";

afterEach(cleanup);

describe("UnitFiveEFields", () => {
  it("рятівні кидки — чекбокси в порядку характеристик", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 5, saveProficiencies: ["wisdom"] }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Спритність" }));

    expect(onChange).toHaveBeenCalledWith({ saveProficiencies: ["dexterity", "wisdom"] });
  });

  it("XP порожнє — плейсхолдер з таблиці CR; ввід пише число, очищення — null", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 5, xp: null }} onChange={onChange} />);

    const xp = screen.getByLabelText("XP") as HTMLInputElement;

    expect(xp.placeholder).toBe("1800");

    fireEvent.change(xp, { target: { value: "2000" } });

    expect(onChange).toHaveBeenLastCalledWith({ xp: 2000 });
  });

  it("лічильники не нижче мінімуму", () => {
    const onChange = vi.fn();

    render(<UnitFiveEFields formData={{ cr: 1, multiattack: 2 }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Атак за дію «Атака»"), { target: { value: "0" } });

    expect(onChange).toHaveBeenLastCalledWith({ multiattack: 1 });
  });
});
