import { describe, expect, it } from "vitest";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { initialSpellFlow } from "@/lib/utils/battle/flows/spell-flow";
import type { SpellFlowState } from "@/lib/utils/battle/flows/spell-flow-types";
import { spellSourceModel } from "@/lib/utils/battle/flows/spell-source";
import type { BattleParticipant, SpellGrant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

const fireball = (over: Record<string, unknown> = {}) =>
  ({ id: "s1", name: "Куля", level: 3, cost: "action", dice: 8, dieSides: 6, upcastDice: 1, targeting: { kind: "enemy" }, resolution: { kind: "auto" }, ...over }) as unknown as BookSpell;

function caster(slots: Record<string, { current: number; max: number }> = {}, grants: SpellGrant[] = []): BattleParticipant {
  const p = makeParticipant({ id: "c" });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER },
    abilities: { ...p.abilities, damageModel: "5e" },
    spellcasting: { ...(p.spellcasting ?? {}), spellSlots: slots, grants } as BattleParticipant["spellcasting"],
  };
}

const flow = (over: Partial<SpellFlowState> = {}): SpellFlowState => ({ ...initialSpellFlow, step: "spell", casterId: "c", ...over });

const pickOf = (over: Partial<NonNullable<SpellFlowState["pick"]>> = {}): NonNullable<SpellFlowState["pick"]> =>
  ({ spellId: "s1", level: 3, targetMode: "multi", needsSaves: true, diceSlots: [], ...over });

describe("spellSourceModel formulaOf (castLevelOf)", () => {
  const slots = { "3": { current: 1, max: 2 }, "5": { current: 1, max: 1 } };

  it("an explicit flow cast level wins over a grant and a slot", () => {
    const grant: SpellGrant = { spellId: "s1", key: "g", castLevel: 4 };

    const model = spellSourceModel(caster(slots, [grant]), flow({ castLevel: 5, slotKey: "3", pick: pickOf() }), fireball(), false);

    expect(textOf(model.formulaOf(fireball()))).toBe("10к6");
  });

  it("a selected grant sets the cast level", () => {
    const grant: SpellGrant = { spellId: "s1", key: "g", castLevel: 4 };

    expect(textOf(spellSourceModel(caster({}, [grant]), flow(), fireball(), false).formulaOf(fireball()))).toBe("9к6");
  });

  it("the chosen slot sets the level only for the picked spell", () => {
    const model = spellSourceModel(caster(slots), flow({ slotKey: "5", pick: pickOf() }), fireball(), false);

    expect(textOf(model.formulaOf(fireball()))).toBe("10к6");
    expect(textOf(model.formulaOf(fireball({ id: "other" })))).toBe("8к6");
  });

  it("without any source it falls back to the spell level", () => {
    expect(textOf(spellSourceModel(caster(slots), flow(), fireball(), false).formulaOf(fireball()))).toBe("8к6");
  });
});

describe("spellSourceModel formulaOf", () => {
  it("is empty without a caster", () => {
    expect(textOf(spellSourceModel(null, flow(), fireball(), false).formulaOf(fireball()))).toBe("");
  });

  it("an input-dice pick shows the chosen dice count", () => {
    const pick = pickOf({ inputDice: { label: "Висота", max: 4, sides: 6 }, diceSlots: [1, 2, 3] });

    expect(textOf(spellSourceModel(caster(), flow({ pick }), fireball(), false).formulaOf(fireball()))).toBe("3к6");
  });

  it("a diceless spell takes its formula from the effects", () => {
    const heal = fireball({ dice: 0, spellEffects: [{ kind: "heal", amount: "2d8" }] });

    expect(textOf(spellSourceModel(caster(), flow(), heal, false).formulaOf(heal))).toBe("2к8");
    expect(textOf(spellSourceModel(caster(), flow(), fireball({ dice: 0 }), false).formulaOf(fireball({ dice: 0 })))).toBe("");
  });
});

describe("spellSourceModel slotChoices", () => {
  it("lists slots for a selected spell and none when cost is bypassed or nothing is selected", () => {
    const c = caster({ "3": { current: 1, max: 2 } });

    expect(spellSourceModel(c, flow(), fireball(), false).slotChoices.map((o) => o.key)).toEqual(["3"]);
    expect(spellSourceModel(c, flow(), fireball(), true).slotChoices).toEqual([]);
    expect(spellSourceModel(c, flow(), null, false).slotChoices).toEqual([]);
  });
});
