import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema, type Effect } from "@/lib/utils/abilities/schema";

const immune = (flag: Effect) => resolved({ trigger: { event: "passive" }, effects: [flag] }, { id: "imm" });

function apply(effect: Effect, target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY })) {
  const ps = [makeParticipant({ id: "o" }), target];

  const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  return applyEffect({ participants: ps, ability, effectIndex: 0, ownerId: "o", effect, targetIds: ["t"], event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 5 }, ctx: { round: 1, rng: seq(0.5) } });
}

describe("immunities", () => {
  it("схема приймає conditionImmunity", () => {
    expect(AbilitySchema.safeParse({ id: "a", name: "Імунітети", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: "all" }] }).success).toBe(true);
    expect(AbilitySchema.safeParse({ id: "a", name: "І", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["fear", "no_reaction"] }] }).success).toBe(true);
  });

  it("applyCondition не діє на ціль з імунітетом до контролю", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: "all" })] });

    const r = apply({ kind: "applyCondition", condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" }, t);

    expect(r.participants[1].battleData.activeEffects).toHaveLength(0);
    expect(r.messages[0]).toContain("⛔");
  });

  it("страх блокує лише втрату моралі", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: ["fear"] })] });

    expect(apply({ kind: "changeMorale", delta: -1, target: "eventTarget" }, t).participants[1].combatStats.morale).toBe(0);
    expect(apply({ kind: "changeMorale", delta: 1, target: "eventTarget" }, t).participants[1].combatStats.morale).toBe(1);
  });

  it("DOT не накладається на ціль з імунітетом до свого типу", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 })] });

    const fire = apply({ kind: "dot", damagePerRound: 3, damageType: "fire", duration: { rounds: 2 }, target: "eventTarget" }, t);

    const bleed = apply({ kind: "dot", damagePerRound: 3, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }, t);

    expect(fire.participants[1].battleData.activeEffects).toHaveLength(0);
    expect(bleed.participants[1].battleData.activeEffects).toHaveLength(1);
  });
});
