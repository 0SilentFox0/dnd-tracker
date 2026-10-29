import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect, describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { endTurnCleanup } from "@/lib/utils/battle/turn/end-turn-cleanup";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";

const hot: Effect = { kind: "hot", healPerRound: "1d4", duration: { rounds: 3 }, target: "eventTarget" };

function cast(targetHp = 10) {
  const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", hp: targetHp, maxHp: 20, side: ParticipantSide.ALLY })];

  return applyEffect({
    participants: ps,
    ability: resolved({ trigger: { event: "action" }, effects: [hot] }),
    effectIndex: 0,
    ownerId: "o",
    effect: hot,
    targetIds: ["t"],
    event: { type: "action", actorId: "o", abilityKey: "k" },
    ctx: { round: 1, rng: seq(0.5) },
  });
}

describe("hot", () => {
  it("кидає кубики один раз і вішає бафф з hotHeal", () => {
    const r = cast();

    expect(r.participants[1].battleData.activeEffects[0]).toMatchObject({ type: "buff", duration: 3, hotHeal: { healPerRound: 3 } });
    expect(r.messages[0]).toContain("💚");
  });

  it("лікує на початку ходу цілі, не вище max HP, і спливає за тривалістю", () => {
    const target = cast(19).participants[1];

    const out = processStartOfTurn(target, 2, [target]);

    expect(out.participant.combatStats.currentHp).toBe(20);
    expect(out.abilityMessages.some((m) => m.includes("+1 HP"))).toBe(true);
    expect(out.participant.battleData.activeEffects[0].duration).toBe(3);
    expect(endTurnCleanup(out.participant).battleData.activeEffects[0].duration).toBe(2);
  });

  it("повне лікування за раунд", () => {
    const target = cast(5).participants[1];

    expect(processStartOfTurn(target, 2, [target]).participant.combatStats.currentHp).toBe(8);
  });

  it("опис", () => {
    expect(describeEffect(hot)).toContain("раунд");
  });
});

describe("dot з кубиками", () => {
  const dot: Effect = { kind: "dot", damagePerRound: "1d6", damageType: "poison", duration: { rounds: 3 }, target: "eventTarget" };

  const applied = () => {
    const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", hp: 30, maxHp: 30, side: ParticipantSide.ENEMY })];

    return applyEffect({ participants: ps, ability: resolved({ trigger: { event: "action" }, effects: [dot] }), effectIndex: 0, ownerId: "o", effect: dot, targetIds: ["t"], event: { type: "action", actorId: "o", abilityKey: "k" }, ctx: { round: 1, rng: seq(0.1) } }).participants[1];
  };

  it("кидає кубики щоразу на початку ходу, а не фіксує при накладанні", () => {
    const target = applied();

    expect(target.battleData.activeEffects[0].dotDamage).toMatchObject({ damagePerRound: 1, dice: "1d6" });
    expect(processStartOfTurn(target, 2, [target], () => 0.99).participant.combatStats.currentHp).toBe(24);
  });

  it("числовий DoT лишається фіксованим", () => {
    const target = applied();

    const fixed = { ...target, battleData: { ...target.battleData, activeEffects: target.battleData.activeEffects.map((e) => ({ ...e, dotDamage: { damagePerRound: 4, damageType: "poison" } })) } };

    expect(processStartOfTurn(fixed, 2, [fixed], () => 0.99).participant.combatStats.currentHp).toBe(26);
  });
});
