// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillSpellEnhancement } from "@/components/skills/form/spell/SkillSpellEnhancement";
import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";

const actions = () => ({
  toggleType: vi.fn(),
  setEffectIncrease: vi.fn(),
  setTargetChange: vi.fn(),
  setAdditionalModifier: vi.fn(),
  setNewSpellId: vi.fn(),
});

afterEach(cleanup);

describe("SkillSpellEnhancement", () => {
  it("edits the additional modifier dice count, keeping the die type", () => {
    const a = actions();

    render(
      <SkillSpellEnhancement
        value={{ types: [SpellEnhancementType.ADDITIONAL_MODIFIER], effectIncrease: "", targetChange: null, additionalModifier: { modifier: "burning", damageDice: "2d8" }, newSpellId: null }}
        spells={[]}
        actions={a}
      />,
    );

    const count = screen.getByPlaceholderText("Кількість") as HTMLInputElement;

    expect(count.value).toBe("2");
    fireEvent.change(count, { target: { value: "3" } });
    expect(a.setAdditionalModifier).toHaveBeenCalledWith({ modifier: "burning", damageDice: "3d8" });
  });

  it("toggles an enhancement type", () => {
    const a = actions();

    render(<SkillSpellEnhancement value={{ types: [], effectIncrease: "", targetChange: null, additionalModifier: {}, newSpellId: null }} spells={[]} actions={a} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(a.toggleType).toHaveBeenCalledTimes(1);
  });
});
