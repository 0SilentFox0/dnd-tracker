import { describe, expect, it } from "vitest";

import { type ActionFlow,applyFlowDamage } from "../action-flow";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { beginConcentration } from "@/lib/utils/battle/concentration";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const rules: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: false }, concentration: { ...DEFAULT_RULES.concentration, enabled: false } };

const casting = (): BattleParticipant => {
  const base = createMockParticipant();

  const begun = beginConcentration([base], base.basicInfo.id, "cast1", "Prayer", 12).participants[0];

  return { ...begun, combatStats: { ...begun.combatStats, currentHp: begun.combatStats.maxHp }, battleData: { ...begun.battleData, pendingCast: { spellId: "prayer", spellName: "Prayer", remainingRounds: 9, totalRounds: 10, lastRound: 5 } } };
};

const hit = (rng: () => number) => {
  const before = casting();

  const after = { ...before, combatStats: { ...before.combatStats, currentHp: before.combatStats.maxHp - 10 } };

  const flow: ActionFlow = { ps: [after], messages: [], summons: [], ctx: { round: 1, rng, rules } };

  applyFlowDamage(flow, before, 10);

  return flow.ps[0];
};

describe("applyFlowDamage with deathSaves and concentration switched off", () => {
  it("still breaks a pending cast when the concentration save fails", () => {
    const out = hit(() => 0);

    expect(out.battleData.activeEffects.some((e) => e.concentration)).toBe(false);
    expect(out.battleData.pendingCast).toBeUndefined();
  });

  it("keeps the pending cast when the concentration save holds", () => {
    const out = hit(() => 0.99);

    expect(out.battleData.activeEffects.some((e) => e.concentration)).toBe(true);
    expect(out.battleData.pendingCast).toBeDefined();
  });
});
