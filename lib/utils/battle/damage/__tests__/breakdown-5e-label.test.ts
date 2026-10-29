import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import type { BattleAttack } from "@/types/battle";

const base = createMockParticipant();

const fiveE = createMockParticipant({ abilities: { ...base.abilities, damageModel: "5e", dexterity: 18, modifiers: { ...base.abilities.modifiers, dexterity: 4 } } });

const target = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1", side: ParticipantSide.ENEMY } });

const rapier: BattleAttack = { id: "r", name: "Рапіра", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "piercing", traits: ["finesse"] };

describe("computeDamageBreakdown 5e stat label", () => {
  it("labels the finesse modifier as Dexterity", () => {
    const r = computeDamageBreakdown({ attacker: fiveE, target, attack: rapier, damageRolls: [5], allParticipants: [fiveE, target] });

    expect(r.steps?.some((s) => textOf(s.label) === "Спритність" && s.value === 4)).toBe(true);
  });
});
