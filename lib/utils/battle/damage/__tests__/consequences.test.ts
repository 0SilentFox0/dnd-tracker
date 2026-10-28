import { describe, expect, it, vi } from "vitest";

import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { dealResistedDamage } from "@/lib/utils/battle/damage/resisted-ability-damage";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const withRules = (deathSaves: Partial<Ruleset["deathSaves"]>): Ruleset => ({ ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, ...deathSaves } });

function downed(sourceType: string): { before: BattleParticipant; after: BattleParticipant } {
  const before = createMockParticipant();

  before.basicInfo = { ...before.basicInfo, sourceType: sourceType as typeof before.basicInfo.sourceType };

  return { before, after: { ...before, combatStats: { ...before.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } } };
}

describe("applyDamageConsequences", () => {
  it("returns the same participant and never rolls when rules are off", () => {
    const { before, after } = downed(ParticipantSourceType.UNIT);

    const rng = vi.fn(() => 0.5);

    const r = applyDamageConsequences({ before, after, amount: 99, rules: DEFAULT_RULES, rng, participants: [after] });

    expect(r.participant).toBe(after);
    expect(r.messages).toEqual([]);
    expect(rng).not.toHaveBeenCalled();
  });

  it("is a no-op without rules", () => {
    const { before, after } = downed(ParticipantSourceType.UNIT);

    const ps = [after];

    const r = applyDamageConsequences({ before, after, amount: 5, rng: () => 0.5, participants: ps });

    expect(r.participant).toBe(after);
    expect(r.participants).toBe(ps);
  });

  it("kills a unit that drops to 0 HP when death saves are on", () => {
    const { before, after } = downed(ParticipantSourceType.UNIT);

    const r = applyDamageConsequences({ before, after, amount: 99, rules: withRules({ enabled: true }), rng: () => 0.5, participants: [after] });

    expect(r.participant.combatStats.status).toBe(CombatStatus.DEAD);
    expect(r.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
  });

  it("leaves the unit unconscious when unitsDieAtZero is off", () => {
    const { before, after } = downed(ParticipantSourceType.UNIT);

    const r = applyDamageConsequences({ before, after, amount: 99, rules: withRules({ enabled: true, unitsDieAtZero: false }), rng: () => 0.5, participants: [after] });

    expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });

  it("hands a hero to death saves instead of the unit rule", () => {
    const { before, after } = downed(ParticipantSourceType.CHARACTER);

    const r = applyDamageConsequences({ before, after, amount: 5, rules: withRules({ enabled: true }), rng: () => 0.5, participants: [after] });

    expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(r.participant.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });
});

describe("dealResistedDamage with rules", () => {
  it("marks a unit DEAD and reports it as downed", () => {
    const unit = createMockParticipant();

    unit.basicInfo = { ...unit.basicInfo, sourceType: ParticipantSourceType.UNIT };

    const r = dealResistedDamage([unit], unit.basicInfo.id, 999, "fire", { rules: withRules({ enabled: true }), rng: () => 0.5 });

    expect(r?.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
    expect(r?.downed).toBe(true);
  });

  it("keeps UNCONSCIOUS without rules", () => {
    const unit = createMockParticipant();

    unit.basicInfo = { ...unit.basicInfo, sourceType: ParticipantSourceType.UNIT };

    const r = dealResistedDamage([unit], unit.basicInfo.id, 999, "fire");

    expect(r?.participants[0].combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });
});
