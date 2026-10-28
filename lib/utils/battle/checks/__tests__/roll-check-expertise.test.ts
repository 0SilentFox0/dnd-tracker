import { describe, expect, it } from "vitest";

import { checkBonus } from "@/lib/utils/battle/checks/roll-check";
import type { BattleParticipant } from "@/types/battle";

const actor = (flags: object[], skillProficiencies: string[] = []) =>
  ({
    basicInfo: { id: "a", side: "ally" },
    abilities: { proficiencyBonus: 3, modifiers: { strength: 0, dexterity: 2, constitution: 0, intelligence: 0, wisdom: 1, charisma: 0 }, skillProficiencies },
    combatStats: { status: "active", currentHp: 10, maxHp: 10 },
    battleData: { activeEffects: [], resolvedAbilities: flags.map((e, i) => ({ id: `x${i}`, key: `character:choices:x${i}`, name: "x", source: { type: "character", id: "choices", name: "Вибори" }, trigger: { event: "passive" }, effects: [e] })) },
  }) as unknown as BattleParticipant;

describe("checkBonus: expertise", () => {
  it("doubles proficiency only for a proficient skill", () => {
    const expert = { kind: "flag", flag: "skillExpertise", skills: ["stealth"] };

    expect(checkBonus(actor([expert], ["stealth"]), { skill: "stealth" }, []).bonus).toBe(6);
    expect(checkBonus(actor([], ["stealth"]), { skill: "stealth" }, []).bonus).toBe(3);
    expect(checkBonus(actor([expert]), { skill: "stealth" }, []).bonus).toBe(0);
    expect(checkBonus(actor([expert, { kind: "flag", flag: "skillProficiency", skills: ["stealth"] }]), { skill: "stealth" }, []).bonus).toBe(6);
  });
});
