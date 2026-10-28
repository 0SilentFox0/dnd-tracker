// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellFormPowerFields } from "@/components/spells/form/SpellFormPowerFields";
import { formToPayload } from "@/lib/utils/spells/model/form";
import type { SpellFormData } from "@/types/spells";

afterEach(cleanup);

const form = (targeting: SpellFormData["targeting"]): SpellFormData => ({
  name: "Ланцюгова блискавка", level: 4, groupId: null, icon: null, description: null, appearanceDescription: null, cost: "action", dice: 2,
  targeting, resolution: { kind: "auto" }, spellEffects: [], raceModifiers: [], stackable: false, maxStacks: null, fx: {},
});

describe("SpellFormPowerFields: ланцюг", () => {
  it("edits fixed dice and flat damage bonus in 5e", () => {
    const setFormData = vi.fn();

    render(<SpellFormPowerFields formData={form({ kind: "enemy" })} setFormData={setFormData} classesEnabled />);
    fireEvent.click(screen.getByLabelText("Фіксовані кубики"));
    expect(setFormData).toHaveBeenLastCalledWith(expect.objectContaining({ fixedDice: true }));
    fireEvent.change(screen.getByLabelText("Добавка до шкоди / лікування"), { target: { value: "7" } });
    expect(setFormData).toHaveBeenLastCalledWith(expect.objectContaining({ damageBonus: 7 }));
  });

  it("shows exact area only for circles", () => {
    const setFormData = vi.fn();

    const { rerender } = render(<SpellFormPowerFields formData={form({ kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 3 })} setFormData={setFormData} classesEnabled />);

    fireEvent.click(screen.getByLabelText("Точна площа 5e"));
    expect(setFormData.mock.calls.at(-1)?.[0].targeting.exact).toBe(true);
    rerender(<SpellFormPowerFields formData={form({ kind: "template", shape: "emanation", size: 20, side: "enemy", maxTargets: 3 })} setFormData={setFormData} classesEnabled />);
    expect(screen.queryByLabelText("Точна площа 5e")).toBeNull();
    expect(screen.queryByLabelText("Дальність, фути")).toBeNull();
  });
  it("перемикач «Ланцюг» вмикає й вимикає chain для area", () => {
    const setFormData = vi.fn();

    const { rerender } = render(<SpellFormPowerFields formData={form({ kind: "area", side: "enemy", maxTargets: 4 })} setFormData={setFormData} />);

    fireEvent.click(screen.getByLabelText("Ланцюг: наступна найближча ціль"));

    expect(setFormData).toHaveBeenLastCalledWith(expect.objectContaining({ targeting: { kind: "area", side: "enemy", maxTargets: 4, chain: true } }));

    rerender(<SpellFormPowerFields formData={form({ kind: "area", side: "enemy", maxTargets: 4, chain: true })} setFormData={setFormData} />);
    fireEvent.click(screen.getByLabelText("Ланцюг: наступна найближча ціль"));

    expect(setFormData.mock.calls.at(-1)?.[0].targeting.chain).toBeUndefined();
  });

  it("для інших цілей перемикача немає", () => {
    render(<SpellFormPowerFields formData={form({ kind: "enemy" })} setFormData={vi.fn()} />);

    expect(screen.queryByLabelText("Ланцюг: наступна найближча ціль")).toBeNull();
  });
});

it("clears a stored damage bonus through the serialized editor payload", () => {
  const setFormData = vi.fn();

  render(<SpellFormPowerFields formData={{ ...form({ kind: "enemy" }), damageBonus: 5 }} setFormData={setFormData} classesEnabled />);
  fireEvent.change(screen.getByLabelText("Добавка до шкоди / лікування"), { target: { value: "" } });

  const payload = JSON.parse(JSON.stringify(formToPayload(setFormData.mock.calls.at(-1)?.[0])));

  expect(payload.damageBonus).toBeNull();
});
