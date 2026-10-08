import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyVampirism } from "@/lib/utils/battle/attack/process/hit-effects";
import { castSpell } from "@/lib/utils/battle/spell";
import type { BattleParticipant } from "@/types/battle";

const vamp = (percent: number, hp = 10) => makeParticipant({ id: "v", hp, maxHp: 30, abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "lifesteal", percent }] })] });

describe("lifesteal", () => {
  it("лікує на відсоток завданої шкоди, не вище max HP", () => {
    expect(applyVampirism([vamp(50)], "v", 9, "melee")).toMatchObject({ vampirismHeal: 4, updatedAttacker: { combatStats: { currentHp: 14 } } });
    expect(applyVampirism([vamp(100, 28)], "v", 9, "melee")).toMatchObject({ vampirismHeal: 2 });
  });

  it("без прапорця, без шкоди чи від заклинання — нічого", () => {
    expect(applyVampirism([makeParticipant({ id: "v" })], "v", 9, "melee").vampirismHeal).toBe(0);
    expect(applyVampirism([vamp(50)], "v", 0, "melee").vampirismHeal).toBe(0);
    expect(applyVampirism([vamp(50)], "v", 9, "magic").vampirismHeal).toBe(0);
  });

  it("Вампіризм: заклинання вішає тимчасовий прапорець на союзника", () => {
    const caster: BattleParticipant = { ...makeParticipant({ id: "c" }), spellcasting: { ...makeParticipant({ id: "c" }).spellcasting, spellSlots: { "5": { max: 1, current: 1 } } } };

    const ally = makeParticipant({ id: "a", hp: 10, maxHp: 30 });

    const spell = { id: "vamp", name: "Вампіризм", level: 5, groupId: null, definition: { dice: 0, cost: "action" as const, targeting: { kind: "ally" as const }, resolution: { kind: "auto" as const }, effects: [{ kind: "flag" as const, flag: "lifesteal" as const, percent: 50, duration: { rounds: 3 } }], raceModifiers: [] } };

    const r = castSpell({ caster, spell, targetIds: ["a"], allParticipants: [caster, ally, makeParticipant({ id: "e", side: ParticipantSide.ENEMY })], currentRound: 1, battleId: "b", diceRolls: [], rng: seq(0.5) });

    expect(applyVampirism(r.allParticipantsUpdated, "a", 10, "ranged").vampirismHeal).toBe(5);
  });
});
