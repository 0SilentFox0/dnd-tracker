import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { mapAction } from "@/lib/utils/battle/fx";

describe("mapAction", () => {
  it("melee hit with slashing → melee/physical", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "slashing" }] } }))).toEqual([
      { key: "b-1:0", archetype: "melee", element: "physical", actorId: "a", actorSide: "ally", targetIds: ["t"], hit: true, critical: false },
    ]);
  });

  it("ranged miss keeps the archetype with hit=false", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: false } }))[0]).toMatchObject({ archetype: "ranged", hit: false });
  });

  it("critical fail is a miss", () => {
    expect(mapAction(action({ actionType: "attack", actionDetails: { isHit: true, isCriticalFail: true } }))[0].hit).toBe(false);
  });

  it("retaliation animates like an attack", () => {
    expect(mapAction(action({ actionType: "retaliation", actionDetails: { attackKind: "melee", isHit: true } }))[0].archetype).toBe("melee");
  });

  it("single-target damage spell → bolt with its element", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellTargeting: "enemy", spellEffectKinds: ["dealDamage"], totalDamage: 9 } }))[0]).toMatchObject({ archetype: "bolt", element: "fire" });
  });

  it("area/all-enemies damage spell → area", () => {
    const a = action({ actionType: "spell", targets: [{ participantId: "t1", participantName: "1" }, { participantId: "t2", participantName: "2" }], actionDetails: { spellDamageType: "cold", spellTargeting: "allEnemies", spellEffectKinds: ["dealDamage"] } });

    expect(mapAction(a)[0]).toMatchObject({ archetype: "area", element: "cold", targetIds: ["t1", "t2"] });
  });

  it("healing spell → heal/nature", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["heal"], totalHealing: 7 } }))[0]).toMatchObject({ archetype: "heal", element: "nature" });
  });

  it("buff spell → buff/radiant; debuff spell → debuff/necrotic", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["modifyStat"], appliedEffects: [{ id: "h", name: "h", duration: 2, type: "buff", targetId: "t" }] } }))[0]).toMatchObject({ archetype: "buff", element: "radiant" });
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["applyCondition"], appliedEffects: [{ id: "s", name: "s", duration: 2, type: "condition", targetId: "t" }] } }))[0]).toMatchObject({ archetype: "debuff", element: "necrotic" });
  });

  it("summon / raise dead → summon", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["summon"] } }))[0].archetype).toBe("summon");
  });

  it("damage spell that also debuffs stays a bolt (damage wins)", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellDamageType: "necrotic", spellEffectKinds: ["dealDamage", "applyCondition"], totalDamage: 4 } }))[0].archetype).toBe("bolt");
  });

  it("appends a death spec per participant brought to 0 HP", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true }, hpChanges: [{ participantId: "t", participantName: "T", oldHp: 5, newHp: 0, change: 5 }] });

    expect(mapAction(a).map((s) => s.archetype)).toEqual(["melee", "death"]);
    expect(mapAction(a)[1]).toMatchObject({ key: "b-1:death:t", targetIds: ["t"] });
  });

  it("cancelled, end_turn, skip_turn, morale_skip → nothing", () => {
    expect(mapAction(action({ actionType: "attack", isCancelled: true }))).toEqual([]);
    expect(mapAction(action({ actionType: "end_turn" }))).toEqual([]);
    expect(mapAction(action({ actionType: "morale_skip" }))).toEqual([]);
  });

  it("ability events only produce deaths", () => {
    expect(mapAction(action({ actionType: "ability", hpChanges: [{ participantId: "t", participantName: "T", oldHp: 3, newHp: 0, change: 3 }] })).map((s) => s.archetype)).toEqual(["death"]);
  });

  it("berserk spell → debuff/fury", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellTargeting: "enemy", spellEffectKinds: ["berserk"] } }))[0]).toMatchObject({ archetype: "debuff", element: "fury" });
  });

  it("«Рій ос» → swarm/nature even though it deals damage", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Рій ос", spellDamageType: "piercing", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 8 } }))[0]).toMatchObject({ archetype: "swarm", element: "nature" });
  });

  it("«Землетрус» → quake/earth", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Землетрус", spellDamageType: "bludgeoning", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 8 } }))[0]).toMatchObject({ archetype: "quake", element: "earth" });
  });

  it("«Телепортація» (note only) → teleport/arcane", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Телепортація", spellTargeting: "ally", spellEffectKinds: ["note"] } }))[0]).toMatchObject({ archetype: "teleport", element: "arcane" });
  });

  it("damage + lasting condition on one target stays a bolt with the damage element", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Глибока заморозка", spellDamageType: "cold", spellTargeting: "enemy", spellEffectKinds: ["dealDamage", "applyCondition"], totalDamage: 6 } }))[0]).toMatchObject({ archetype: "bolt", element: "cold" });
  });

  const spell = (spellName: string, actionDetails: Record<string, unknown> = {}) => mapAction(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }))[0];

  it("«Корені» → entangle/nature", () => {
    expect(spell("Корені", { spellTargeting: "enemy", spellEffectKinds: ["applyCondition"] })).toMatchObject({ archetype: "entangle", element: "nature" });
  });

  it("summon takes the override element", () => {
    expect(spell("Прикликання елементаля: Вода", { spellTargeting: "self", spellEffectKinds: ["summon"] })).toMatchObject({ archetype: "summon", element: "cold" });
    expect(spell("Призив Фенікса", { spellEffectKinds: ["summon"] })).toMatchObject({ archetype: "summon", element: "fire" });
  });

  it("«Аватар» → necrotic", () => {
    expect(spell("Аватар", { spellTargeting: "self", spellEffectKinds: ["modifyStat"] })).toMatchObject({ archetype: "buff", element: "necrotic" });
  });

  it("«Кам'яні шипи» → earth element, computed archetype", () => {
    expect(spell("Кам'яні шипи", { spellDamageType: "piercing", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "area", element: "earth" });
  });

  it("«Метеоритний дощ» → meteor/fire", () => {
    expect(spell("Метеоритний дощ", { spellDamageType: "bludgeoning", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "meteor", element: "fire" });
  });

  it("«Поспіх» → haste/wind, «Вампіризм» → fury", () => {
    expect(spell("Поспіх", { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] })).toMatchObject({ archetype: "haste", element: "wind" });
    expect(spell("Вампіризм", { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] })).toMatchObject({ element: "fury" });
  });

  it("«Потойбічна стріла» → eldritch, keeping the fire element for the hit frame", () => {
    expect(spell("Потойбічна стріла", { spellDamageType: "fire", spellTargeting: "enemy", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "eldritch", element: "fire" });
  });

  it("«Сповільнення» → slow, «Кам'яна шкіра» → stoneskin/earth", () => {
    expect(spell("Сповільнення", { spellTargeting: "enemy", spellEffectKinds: ["modifyStat"], appliedEffects: [{ id: "s", name: "Сповільнення", duration: 3, type: "debuff", targetId: "t" }] })).toMatchObject({ archetype: "slow", element: "arcane" });
    expect(spell("Кам'яна шкіра", { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] })).toMatchObject({ archetype: "stoneskin", element: "earth" });
  });
});
