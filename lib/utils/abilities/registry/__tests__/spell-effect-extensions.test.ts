import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/targets";
import { applyEffect, describeEffect } from "@/lib/utils/abilities/registry/effects";
import { EffectSchema } from "@/lib/utils/abilities/schema";

const enemy = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

describe("target everyone", () => {
  it("усі активні учасники, включно із заклинателем і союзниками", () => {
    const dead = { ...makeParticipant({ id: "d", hp: 0 }), combatStats: { ...makeParticipant({ id: "d" }).combatStats, currentHp: 0, status: "dead" as const } };

    const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "a" }), enemy("e"), dead];

    expect(resolveTargetIds("everyone", "o", { type: "action", actorId: "o", abilityKey: "k" }, ps)).toEqual(["o", "a", "e"]);
  });
});

describe("dealDamage falloff", () => {
  const effect = { kind: "dealDamage" as const, amount: 100, falloff: [100, 50, 25] };

  const run = (ids: string[]) => {
    const ps = [makeParticipant({ id: "o" }), ...ids.map(enemy)];

    return applyEffect({
      participants: ps,
      ability: resolved({ trigger: { event: "action" }, effects: [effect] }),
      effectIndex: 0,
      ownerId: "o",
      effect,
      targetIds: ids,
      event: { type: "action", actorId: "o", abilityKey: "k" },
      ctx: { round: 1, rng: seq(0.5) },
    }).participants.slice(1).map((p) => 200 - p.combatStats.currentHp);
  };

  it("зменшує шкоду по цілях за порядком", () => {
    expect(run(["a", "b", "c"])).toEqual([100, 50, 25]);
  });

  it("цілі за межами списку беруть останнє значення", () => {
    expect(run(["a", "b", "c", "d"])).toEqual([100, 50, 25, 25]);
  });

  it("опис містить спад", () => {
    expect(describeEffect(effect)).toContain("100% → 50% → 25%");
  });
});

describe("summon schema", () => {
  it("приймає unitId або group+tier, відхиляє порожнє", () => {
    expect(EffectSchema.safeParse({ kind: "summon", unitId: "u1" }).success).toBe(true);
    expect(EffectSchema.safeParse({ kind: "summon", group: "Демони", tier: 3 }).success).toBe(true);
    expect(EffectSchema.safeParse({ kind: "summon", group: "Демони" }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "summon" }).success).toBe(false);
  });
});

describe("spellRoll amount", () => {
  it("відсоток — число або формула; нуль і зайве відхиляються", () => {
    const dmg = (spellRoll: unknown) => EffectSchema.safeParse({ kind: "dealDamage", amount: { spellRoll } }).success;

    expect(dmg(100)).toBe(true);
    expect(dmg({ formula: "100 + lost_hp_percent" })).toBe(true);
    expect(dmg(0)).toBe(false);
    expect(dmg(501)).toBe(false);
    expect(dmg("100")).toBe(false);
  });

  it("опис показує формулу", () => {
    expect(describeEffect({ kind: "dealDamage", amount: { spellRoll: { formula: "100 + lost_hp_percent" } } })).toContain("100 + lost_hp_percent");
  });
});
