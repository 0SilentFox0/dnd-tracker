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
});
