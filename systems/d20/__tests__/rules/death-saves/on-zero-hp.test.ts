import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { d20OnZeroHp } from "@/systems/d20/rules/death-saves/on-zero-hp";
import type { BattleParticipant } from "@/types/battle";

const rules: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true, unitsDieAtZero: true } };

const mock = (sourceType: ParticipantSourceType, hp: number, maxHp = 20): BattleParticipant => {
  const base = createMockParticipant();

  return createMockParticipant({ basicInfo: { ...base.basicInfo, sourceType }, combatStats: { ...base.combatStats, currentHp: hp, maxHp, tempHp: 0 } });
};

const hit = (before: BattleParticipant, amount: number) => d20OnZeroHp({ before, after: applyRawDamage(before, amount), amount, rules, rng: () => 0.5, participants: [before] });

describe("d20OnZeroHp", () => {
  it("a hero dropped to 0 starts dying", () => {
    const r = hit(mock(ParticipantSourceType.CHARACTER, 5), 6);

    expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(r.participant.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });

  it("overflow of at least max HP kills a hero outright", () => {
    const r = hit(mock(ParticipantSourceType.CHARACTER, 5), 30);

    expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
  });

  it("a unit dies at 0", () => {
    const r = hit(mock(ParticipantSourceType.UNIT, 5), 6);

    expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
  });
});
