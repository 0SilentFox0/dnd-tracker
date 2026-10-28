// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellFormPowerFields } from "@/components/spells/form/SpellFormPowerFields";
import type { SpellFormData } from "@/types/spells";

afterEach(cleanup);

const form = (targeting: SpellFormData["targeting"]): SpellFormData => ({
  name: "Ланцюгова блискавка", level: 4, groupId: null, icon: null, description: null, appearanceDescription: null, cost: "action", dice: 2,
  targeting, resolution: { kind: "auto" }, spellEffects: [], raceModifiers: [], stackable: false, maxStacks: null, fx: {},
});

describe("SpellFormPowerFields: ланцюг", () => {
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
