import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";

describe("collectModifiers", () => {
  it("умовна пасивка вмикається від HP", () => {
    const ab = resolved({ trigger: { event: "passive" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] });

    const healthy = makeParticipant({ id: "a", hp: 20, abilities: [ab] });

    const hurt = makeParticipant({ id: "a", hp: 5, abilities: [ab] });

    expect(statWithModifiers([healthy], "a", "armor", 14)).toBe(14);
    expect(statWithModifiers([hurt], "a", "armor", 14)).toBe(16);
  });

  it("аура союзника і ворожа аура; мертве джерело не діє", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 10, target: "allAllies" }] });

    const curse = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: -1, target: "allEnemies" }] }, { id: "c" });

    const banner = makeParticipant({ id: "b", abilities: [aura] });

    const a = makeParticipant({ id: "a" });

    const witch = makeParticipant({ id: "w", side: ParticipantSide.ENEMY, abilities: [curse] });

    expect(collectModifiers([a, banner, witch], "a", { damage: { kind: "melee" } }).percent).toBe(10);
    expect(statWithModifiers([a, banner, witch], "a", "armor", 14)).toBe(13);

    const deadBanner = { ...banner, combatStats: { ...banner.combatStats, status: "dead" as const } };

    expect(collectModifiers([a, deadBanner], "a", { damage: { kind: "melee" } }).percent).toBe(0);
  });

  it("подійний скіл не дає бонусу поза подією", () => {
    const onHit = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 25 }] });

    expect(collectModifiers([makeParticipant({ id: "a", abilities: [onHit] })], "a", { damage: { kind: "melee" } }).percent).toBe(0);
  });

  it("запечені стати ігнорують пасивки, але враховують таймові ефекти", () => {
    const ab = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: 3 }] });

    const p = makeParticipant({ id: "a", abilities: [ab] });

    const withTimed = {
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "x", name: "Порив", type: "buff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat" as const, stat: "initiative" as const, flat: 2 }] }],
      },
    };

    expect(collectModifiers([withTimed], "a", { stat: "initiative" }).flat).toBe(2);
  });

  it("школа магії і physical-фільтр", () => {
    const chaos = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 25 }] });

    const phys = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2 }] }, { id: "p" });

    const ps = [makeParticipant({ id: "a", abilities: [chaos, phys] })];

    expect(collectModifiers(ps, "a", { damage: { kind: "magic", school: "dark" } }).percent).toBe(0);
    expect(collectModifiers(ps, "a", { damage: { kind: "magic", school: "chaos" } }).percent).toBe(25);
    expect(collectModifiers(ps, "a", { damage: { kind: "ranged" } }).flat).toBe(2);
    expect(collectModifiers(ps, "a", { damage: { kind: "magic" } }).flat).toBe(0);
  });

  it("старі рядки ActiveEffect і extra-модифікатори дії", () => {
    const p = makeParticipant({ id: "a" });

    const legacy = {
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "x", name: "Крит", type: "buff" as const, duration: 1, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "ac_bonus", value: 2 }, { type: "advantage_attack", value: 1 }, { type: "ranged_damage_reduction", value: 50, isPercentage: true }] }],
      },
    };

    expect(statWithModifiers([legacy], "a", "armor", 10)).toBe(12);
    expect(findFlags([legacy], "a", "advantage")).toHaveLength(1);
    expect(collectModifiers([legacy], "a", { damage: { kind: "ranged" } }).percent).toBe(0);
    expect(findFlags([p], "a", "guaranteedHit", [{ kind: "flag", flag: "guaranteedHit" }])).toHaveLength(1);
  });
});
