import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { ResolveAttackCtx } from "@/lib/utils/rules/systems/types";
import type { BattleAttack } from "@/types/battle";

const SWORD: BattleAttack = { id: "s", name: "Sword", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const attacker = placed("a", { side: ParticipantSide.ALLY, hp: 20, attacks: [SWORD] });

const target = placed("t", { side: ParticipantSide.ENEMY, hp: 20, attacks: [SWORD] });

const { combat } = ruleSystemOf(DEFAULT_RULES);

const ctx = (over: Partial<ResolveAttackCtx> = {}): ResolveAttackCtx => ({ attacker, target, attack: SWORD, participants: [attacker, target], rules: DEFAULT_RULES, rng: () => 0.5, manualRoll: 10, ...over });

describe("d20 resolveAttack", () => {
  it("hits when d20 + bonus reaches the target AC and reports AC as the defence value", () => {
    const r = combat.resolveAttack(ctx({ manualRoll: 20 }));

    expect(r.defenseValue).toBeGreaterThan(0);
    expect(r.attackRoll.chosenD20).toBe(20);
    expect(r.isHit).toBe(true);
  });

  it("a natural 1 always misses", () => {
    const r = combat.resolveAttack(ctx({ manualRoll: 1 }));

    expect(r.isHit).toBe(false);
    expect(r.attackRoll.isCriticalFail).toBe(true);
  });

  it("advantage writes the second-roll line", () => {
    const r = combat.resolveAttack(ctx({ roll: { mode: "advantage", advantage: 15 } }));

    expect(r.attackRoll.secondRoll).toMatchObject({ mode: "advantage", value: 15 });
    expect(r.lines).toHaveLength(1);
  });

  it("an off-turn strike rolls both dice itself and labels the second-roll line with the noun", () => {
    const noun = textRef("battleLog.offTurn.nouns.retaliation");

    const r = combat.resolveAttack(ctx({ manualRoll: undefined, offTurn: { noun } }));

    expect(r.attackRoll.chosenD20).toBeGreaterThan(0);
  });

  it("abortedRoll never hits on its own", () => {
    expect(combat.abortedRoll(ctx({ manualRoll: 1 })).isHit).toBe(false);
  });
});
