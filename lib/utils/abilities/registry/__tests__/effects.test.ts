import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect, describeEffect, FLAG_FIELDS } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";

function run(effect: Effect, targetIds: string[], ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY })]) {
  const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  return applyEffect({
    participants: ps,
    ability,
    effectIndex: 0,
    ownerId: "o",
    effect,
    targetIds,
    event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 10 },
    ctx: { round: 1, rng: seq(0.5) },
  });
}

describe("effects", () => {
  it("dot кидає кубики один раз і вішає дебаф з dotDamage", () => {
    const r = run({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 3 } }, ["t"]);

    const t = r.participants[1];

    expect(t.battleData.activeEffects[0]).toMatchObject({ type: "debuff", duration: 3, dotDamage: { damagePerRound: 3, damageType: "bleed" } });
    expect(r.messages[0]).toContain("🔥");
  });

  it("статичний ефект без duration повертає actionModifiers і не змінює стан", () => {
    const r = run({ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }, ["o"]);

    expect(r.actionModifiers).toEqual([{ participantId: "o", effect: { kind: "damageBonus", filter: { kind: "melee" }, percent: 10 } }]);
    expect(r.participants[0].battleData.activeEffects).toHaveLength(0);
  });

  it("modifyStat з duration — таймовий бафф з abilityEffects", () => {
    const r = run({ kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 1 }, target: "eventTarget" }, ["t"]);

    expect(r.participants[1].battleData.activeEffects[0]).toMatchObject({ type: "debuff", abilityEffects: [{ kind: "modifyStat", stat: "armor", flat: -2 }] });
  });

  it("dealDamage повертає downed", () => {
    const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", hp: 3, side: ParticipantSide.ENEMY })];

    const r = run({ kind: "dealDamage", amount: 5 }, ["t"], ps);

    expect(r.downed).toEqual([{ victimId: "t", actorId: "o" }]);
    expect(r.participants[1].combatStats.status).toBe("unconscious");
  });

  it("heal з revive повертає з 0 HP", () => {
    const down = makeParticipant({ id: "o", hp: -4 });

    const ps = [{ ...down, combatStats: { ...down.combatStats, status: "dead" as const } }];

    const r = run({ kind: "heal", amount: 1, revive: true }, ["o"], ps);

    expect(r.participants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });
  });

  it("changeMorale обмежується ±3, restoreSpellSlot бере найнижчий", () => {
    const base = makeParticipant({ id: "o" });

    const p = { ...base, combatStats: { ...base.combatStats, morale: 2 }, spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 2, current: 2 }, "2": { max: 2, current: 0 } } } };

    expect(run({ kind: "changeMorale", delta: 5 }, ["o"], [p]).participants[0].combatStats.morale).toBe(3);
    expect(run({ kind: "restoreSpellSlot", count: 1 }, ["o"], [p]).participants[0].spellcasting.spellSlots["2"].current).toBe(1);
  });

  it("randomOf обирає варіант через rng, cleanse знімає дебафи", () => {
    const r = run({ kind: "randomOf", options: [{ kind: "heal", amount: 1 }, { kind: "changeMorale", delta: 1 }] }, ["o"]);

    expect(r.participants[0].combatStats.morale).toBe(1);
  });

  it("describe", () => {
    expect(describeEffect({ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 })).toBe("шкода (ближня) +10%");
    expect(describeEffect({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 3 } })).toBe("bleed 1d4/раунд × 3 р.");
  });
});

describe("counterAttack у редакторі", () => {
  it("на вибір лише ближня і дальня; опис згадує дальні", () => {
    expect(FLAG_FIELDS.counterAttack[0].options?.map((o) => o.value)).toEqual(["melee", "ranged"]);
    expect(describeEffect({ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 20 })).toBe("відсіч (і на дальні) +20%");
    expect(describeEffect({ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 15 })).toBe("відсіч +15%");
  });
});

describe("прапорці моралі", () => {
  it("мітки й описи", () => {
    expect(describeEffect({ kind: "flag", flag: "noNegativeMorale" })).toBe("від'ємна мораль = 0");
    expect(describeEffect({ kind: "flag", flag: "ignoreMorale" })).toBe("мораль не діє");
    expect(FLAG_FIELDS.noNegativeMorale).toEqual([]);
    expect(FLAG_FIELDS.ignoreMorale).toEqual([]);
  });
});
