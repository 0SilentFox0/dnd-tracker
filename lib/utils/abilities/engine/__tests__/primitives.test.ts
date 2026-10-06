import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveAmount } from "@/lib/utils/abilities/engine/amount";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/targets";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { recordUse, resetUsage, withinLimits } from "@/lib/utils/abilities/engine/usage";
import { rollDice } from "@/lib/utils/common/dice";

describe("amount", () => {
  it("кидає кубики через rng", () => {
    expect(rollDice("2d6+1", seq(0, 0.99))).toBe(1 + 6 + 1);
  });

  it("формула, відсоток від шкоди і від макс. HP", () => {
    const owner = makeParticipant({ id: "o", level: 4, hp: 10, maxHp: 20 });

    const rng = seq(0);

    expect(resolveAmount({ formula: "2*hero_level" }, { owner, rng })).toBe(8);
    expect(resolveAmount({ percentOf: "eventDamage", value: 50 }, { owner, eventDamage: 9, rng })).toBe(4);
    expect(resolveAmount({ percentOf: "maxHp", value: 25 }, { owner, rng })).toBe(5);
  });
});

describe("targets", () => {
  const a = makeParticipant({ id: "a" });

  const b = makeParticipant({ id: "b" });

  const dead = { ...makeParticipant({ id: "d", hp: 0 }), combatStats: { ...makeParticipant({ id: "d" }).combatStats, currentHp: 0, status: "dead" as const } };

  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  const ps = [a, b, dead, e];

  it("allAllies — живі союзники разом із власником", () => {
    expect(resolveTargetIds("allAllies", "a", { type: "roundStart" }, ps)).toEqual(["a", "b"]);
  });

  it("eventTarget і eventActor з атаки", () => {
    const ev = { type: "hit" as const, actorId: "e", targetId: "a", attackKind: "melee" as const, damage: 3 };

    expect(resolveTargetIds("eventActor", "a", ev, ps)).toEqual(["e"]);
    expect(resolveTargetIds("eventTarget", "a", ev, ps)).toEqual(["a"]);
  });

  it("бонусна дія без цілі → власник", () => {
    expect(resolveTargetIds("eventTarget", "a", { type: "bonusAction", actorId: "a", abilityKey: "k" }, ps)).toEqual(["a"]);
  });
});

describe("usage", () => {
  const ab = resolved({ trigger: { event: "turnStart" }, limits: { perBattle: 2, perRound: 1 }, effects: [{ kind: "note", text: "x" }] });

  it("рахує й скидає лічильники", () => {
    let p = makeParticipant({ id: "p" });

    expect(withinLimits(p, ab)).toBe(true);
    p = recordUse(p, ab.key);
    expect(withinLimits(p, ab)).toBe(false);
    p = resetUsage(p, "round");
    expect(withinLimits(p, ab)).toBe(true);
    p = resetUsage(recordUse(p, ab.key), "round");
    expect(withinLimits(p, ab)).toBe(false);
  });
});

describe("timed effects", () => {
  it("повторне застосування оновлює тривалість, stackable — додає", () => {
    let p = makeParticipant({ id: "p" });

    const input = { timedKey: "k#0", name: "Лють", type: "buff" as const, rounds: 2, stackable: false };

    p = upsertTimedEffect(p, input, 1);
    p = upsertTimedEffect(p, { ...input, rounds: 3 }, 2);
    expect(p.battleData.activeEffects).toHaveLength(1);
    expect(p.battleData.activeEffects[0].duration).toBe(3);
    p = upsertTimedEffect(p, { ...input, stackable: true }, 2);
    expect(p.battleData.activeEffects).toHaveLength(2);
  });
});

describe("hp", () => {
  it("спершу tempHp, далі HP і статус", () => {
    const p = { ...makeParticipant({ id: "p", hp: 5 }), combatStats: { ...makeParticipant({ id: "p", hp: 5 }).combatStats, tempHp: 2 } };

    expect(applyRawDamage(p, 7).combatStats).toMatchObject({ tempHp: 0, currentHp: 0, status: "unconscious" });
    // як атака: HP не нижче 0, тож надмірна шкода від уміння лишає непритомним, а не мертвим
    expect(applyRawDamage(p, 9).combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
  });
});
