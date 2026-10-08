import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { applyDamageToTarget } from "@/lib/utils/battle/attack/process/damage";
import { processStartOfTurn } from "@/lib/utils/battle/battle-turn";

function cast(effect: Effect) {
  const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY })];

  return applyEffect({
    participants: ps,
    ability: resolved({ trigger: { event: "action" }, effects: [effect] }),
    effectIndex: 0,
    ownerId: "o",
    effect,
    targetIds: ["t"],
    event: { type: "action", actorId: "o", abilityKey: "k" },
    ctx: { round: 1, rng: seq(0.5) },
  }).participants[1];
}

describe("skip_action", () => {
  const confused = () => cast({ kind: "applyCondition", condition: "skip_action", percent: 50, duration: { rounds: 2 }, target: "eventTarget" });

  it("зберігає шанс у стані", () => {
    expect(confused().battleData.activeEffects[0].effects).toEqual([{ type: "skip_action", value: 50 }]);
  });

  it("кидок нижче шансу — дія втрачена", () => {
    const t = confused();

    const out = processStartOfTurn(t, 2, [t], seq(0.49));

    expect(out.participant.actionFlags.hasUsedAction).toBe(true);
    expect(out.abilityMessages.some((m) => m.includes("втрачає дію"))).toBe(true);
  });

  it("кидок не нижче шансу — дія доступна", () => {
    const t = confused();

    expect(processStartOfTurn(t, 2, [t], seq(0.5)).participant.actionFlags.hasUsedAction).toBe(false);
  });

  it("без стану rng не витрачається", () => {
    const p = makeParticipant({ id: "p" });

    const rng = seq(0);

    let calls = 0;

    processStartOfTurn(p, 2, [p], () => (calls++, rng()));
    expect(calls).toBe(0);
  });
});

describe("breakOnDamage", () => {
  const blind = () => cast({ kind: "applyCondition", condition: "disable_spell_casting", breakOnDamage: true, duration: { rounds: 2 }, target: "eventTarget" });

  it("стан позначається", () => {
    expect(blind().battleData.activeEffects[0].breakOnDamage).toBe(true);
  });

  it("знімається шкодою від атаки і від ефекту", () => {
    expect(applyDamageToTarget(blind(), 3).updatedTarget.battleData.activeEffects).toHaveLength(0);
    expect(applyRawDamage(blind(), 3).battleData.activeEffects).toHaveLength(0);
  });

  it("нульова шкода не знімає", () => {
    expect(applyDamageToTarget(blind(), 0).updatedTarget.battleData.activeEffects).toHaveLength(1);
  });

  it("стани без breakOnDamage лишаються", () => {
    const t = cast({ kind: "applyCondition", condition: "no_reaction", duration: { rounds: 2 }, target: "eventTarget" });

    expect(applyRawDamage(t, 3).battleData.activeEffects).toHaveLength(1);
  });
});
