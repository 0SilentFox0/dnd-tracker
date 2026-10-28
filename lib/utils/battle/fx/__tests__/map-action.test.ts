import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { mapAction } from "@/lib/utils/battle/fx";
import { SPELL_FX_BY_NAME } from "@/scripts/constructor/backfill/spell-fx-by-name";

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

  it("takes the spell signature from actionDetails.spellFx, not the name", () => {
    const a = action({ actionType: "spell", actionDetails: { spellName: "Рій ос", spellFx: { archetype: "bolt", element: "cold" } } });

    expect(mapAction(a)[0]).toMatchObject({ archetype: "bolt", element: "cold" });
  });

  it("an action without spellFx falls back to the generic rules even for a known name", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Рій ос" } }))[0].archetype).not.toBe("swarm");
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
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Рій ос", spellFx: SPELL_FX_BY_NAME["Рій ос"], spellDamageType: "piercing", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 8 } }))[0]).toMatchObject({ archetype: "swarm", element: "nature" });
  });

  it("«Землетрус» → quake/earth", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Землетрус", spellFx: SPELL_FX_BY_NAME["Землетрус"], spellDamageType: "bludgeoning", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 8 } }))[0]).toMatchObject({ archetype: "quake", element: "earth" });
  });

  it("«Телепортація» (note only) → teleport/arcane", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Телепортація", spellFx: SPELL_FX_BY_NAME["Телепортація"], spellTargeting: "ally", spellEffectKinds: ["note"] } }))[0]).toMatchObject({ archetype: "teleport", element: "arcane" });
  });

  it("damage + lasting condition on one target stays a bolt with the damage element", () => {
    expect(mapAction(action({ actionType: "spell", actionDetails: { spellName: "Глибока заморозка", spellFx: SPELL_FX_BY_NAME["Глибока заморозка"], spellDamageType: "cold", spellTargeting: "enemy", spellEffectKinds: ["dealDamage", "applyCondition"], totalDamage: 6 } }))[0]).toMatchObject({ archetype: "bolt", element: "cold" });
  });

  const spell = (spellName: string, actionDetails: Record<string, unknown> = {}) => mapAction(action({ actionType: "spell", actionDetails: { spellName, spellFx: SPELL_FX_BY_NAME[spellName], ...actionDetails } }))[0];

  it("«Корені» → entangle/nature", () => {
    expect(spell("Корені", { spellTargeting: "enemy", spellEffectKinds: ["applyCondition"] })).toMatchObject({ archetype: "entangle", element: "nature" });
  });

  it("every summon plays its own element's animation", () => {
    const summon = { spellTargeting: "self", spellEffectKinds: ["summon"] };

    expect(spell("Прикликання елементаля: Вогонь", summon)).toMatchObject({ archetype: "firesummon", element: "fire" });
    expect(spell("Прикликання елементаля: Вода", summon)).toMatchObject({ archetype: "watersummon", element: "cold" });
    expect(spell("Прикликання елементаля: Земля", summon)).toMatchObject({ archetype: "earthsummon", element: "earth" });
    expect(spell("Прикликання елементаля: Повітря", summon)).toMatchObject({ archetype: "airsummon", element: "lightning" });
    expect(spell("Призив Фенікса", summon)).toMatchObject({ archetype: "phoenix", element: "fire" });
    expect(spell("Аватар", summon)).toMatchObject({ archetype: "avatar", element: "necrotic" });
    expect(spell("Інший призов", summon)).toMatchObject({ archetype: "summon", element: "radiant" });
  });

  it("Nature signatures override the computed heal/bolt", () => {
    expect(spell("Слово лікування", { spellTargeting: "ally", spellEffectKinds: ["heal"], totalHealing: 9 })).toMatchObject({ archetype: "healword", element: "nature" });
    expect(spell("Хвиля зцілення", { spellTargeting: "allAllies", spellEffectKinds: ["heal"], totalHealing: 9 })).toMatchObject({ archetype: "healwave", element: "nature" });
    expect(spell("Відродження лісу", { spellTargeting: "allAlliesDead", spellEffectKinds: ["heal"], totalHealing: 9 })).toMatchObject({ archetype: "rebirth", element: "nature" });
    expect(spell("Дух лісу", { spellTargeting: "ally", spellEffectKinds: ["hot", "flag"] })).toMatchObject({ archetype: "forestspirit", element: "nature" });
    expect(spell("Колючі лози", { spellDamageType: "poison", spellTargeting: "enemy", spellEffectKinds: ["dot"] })).toMatchObject({ archetype: "thornvines", element: "poison" });
    expect(spell("Місячний промінь", { spellDamageType: "radiant", spellTargeting: "enemy", spellEffectKinds: ["dealDamage", "flag"], totalDamage: 9 })).toMatchObject({ archetype: "moonbeam", element: "radiant" });
  });

  it("«Кам'яні шипи» → earth element, computed archetype", () => {
    expect(spell("Кам'яні шипи", { spellDamageType: "piercing", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "area", element: "earth" });
  });

  it("«Метеоритний дощ» → meteor/fire", () => {
    expect(spell("Метеоритний дощ", { spellDamageType: "bludgeoning", spellTargeting: "area", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "meteor", element: "fire" });
  });

  it("«Поспіх» → haste/wind, «Вампіризм» → vampire/fury", () => {
    expect(spell("Поспіх", { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] })).toMatchObject({ archetype: "haste", element: "wind" });
    expect(spell("Вампіризм", { spellTargeting: "ally", spellEffectKinds: ["flag"] })).toMatchObject({ archetype: "vampire", element: "fury" });
  });

  it("«Потойбічна стріла» → eldritch, keeping the fire element for the hit frame", () => {
    expect(spell("Потойбічна стріла", { spellDamageType: "fire", spellTargeting: "enemy", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toMatchObject({ archetype: "eldritch", element: "fire" });
  });

  it("«Сповільнення» → slow, «Кам'яна шкіра» → stoneskin/earth", () => {
    expect(spell("Сповільнення", { spellTargeting: "enemy", spellEffectKinds: ["modifyStat"], appliedEffects: [{ id: "s", name: "Сповільнення", duration: 3, type: "debuff", targetId: "t" }] })).toMatchObject({ archetype: "slow", element: "necrotic" });
    expect(spell("Кам'яна шкіра", { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] })).toMatchObject({ archetype: "stoneskin", element: "earth" });
  });

  it("Dark signatures override the computed debuff/bolt/area", () => {
    const curse = { spellTargeting: "enemy", spellEffectKinds: ["modifyStat"], appliedEffects: [{ id: "d", name: "x", duration: 3, type: "debuff", targetId: "t" }] };

    expect(spell("Ослаблення", curse)).toMatchObject({ archetype: "siphon", element: "necrotic" });
    expect(spell("Немічність", curse)).toMatchObject({ archetype: "rust", element: "necrotic" });
    expect(spell("Страждання", curse)).toMatchObject({ archetype: "thorns" });
    expect(spell("Смуток", curse)).toMatchObject({ archetype: "raincloud" });
    expect(spell("Розсіяність", { spellTargeting: "enemy", spellEffectKinds: ["applyCondition"] })).toMatchObject({ archetype: "whispers" });
    expect(spell("Сліпота", { spellTargeting: "enemy", spellEffectKinds: ["applyCondition"] })).toMatchObject({ archetype: "blindfold" });
    expect(spell("Ляльковод", { spellTargeting: "enemy", spellEffectKinds: ["charm"] })).toMatchObject({ archetype: "puppet" });
    expect(spell("Чума", { spellDamageType: "poison", spellTargeting: "enemy", spellEffectKinds: ["dot"] })).toMatchObject({ archetype: "pestilence", element: "poison" });
    expect(spell("Прокляття Потойбіччя", { spellDamageType: "necrotic", spellTargeting: "allEnemies", spellEffectKinds: ["dealDamage", "changeMorale"], totalDamage: 30 })).toMatchObject({ archetype: "netherhands", element: "necrotic" });
  });

  it("Light signatures override the computed archetype", () => {
    const ally = { spellTargeting: "ally", spellEffectKinds: ["modifyStat"] };

    expect(spell("Очищення", { spellTargeting: "ally", spellEffectKinds: ["cleanse"] })).toMatchObject({ archetype: "cleanse", element: "radiant" });
    expect(spell("Регенерація", { spellTargeting: "ally", spellEffectKinds: ["hot"] })).toMatchObject({ archetype: "regenerate", element: "nature" });
    expect(spell("Праведна міць", ally)).toMatchObject({ archetype: "might", element: "radiant" });
    expect(spell("Ухилення", { spellTargeting: "ally", spellEffectKinds: ["flag"] })).toMatchObject({ archetype: "deflect" });
    expect(spell("Божественна сила", { spellTargeting: "ally", spellEffectKinds: ["damageBonus"] })).toMatchObject({ archetype: "empower", element: "radiant" });
    expect(spell("Магічний імунітет", { spellTargeting: "ally", spellEffectKinds: ["flag"] })).toMatchObject({ archetype: "spellward", element: "arcane" });
    expect(spell("Вічне світло", { spellTargeting: "ally", spellEffectKinds: ["heal", "hot"], totalHealing: 12 })).toMatchObject({ archetype: "sunbeam", element: "radiant" });
    expect(spell("Воскресіння", { spellTargeting: "allyDead", spellEffectKinds: ["heal"], totalHealing: 20 })).toMatchObject({ archetype: "resurrect", element: "radiant" });
    expect(spell("Божественна відплата", { spellDamageType: "radiant", spellTargeting: "enemy", spellEffectKinds: ["dealDamage"], totalDamage: 30 })).toMatchObject({ archetype: "retribution", element: "radiant" });
    expect(spell("Слово світла", { spellDamageType: "radiant", spellTargeting: "allEnemies", spellEffectKinds: ["dealDamage"], totalDamage: 30 })).toMatchObject({ archetype: "holyword", element: "radiant" });
  });
});

describe("mapAction — точка шаблону", () => {
  const cast = (details: Record<string, unknown>) => action({ actionType: "spell", actionDetails: { spellTargeting: "template", spellEffectKinds: ["dealDamage"], totalDamage: 12, ...details } });

  it("переносить aimCell у FxSpec.at", () => {
    expect(mapAction(cast({ aimCell: { x: 4, y: 2 } }))[0].at).toEqual({ x: 4, y: 2 });
  });

  it("без aimCell (бій без карти) — at відсутнє", () => {
    expect(mapAction(cast({}))[0]).not.toHaveProperty("at");
  });
});

describe("mapAction dice", () => {
  const rolls = [{ kind: "attack" as const, rollerId: "a", dice: [{ sides: 20 as const, value: 12 }] }];

  it("attack with diceRolls → [dice, melee]; without → [melee]; cancelled → []", () => {
    const withDice = mapAction(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true, diceRolls: rolls } }));

    expect(withDice.map((s) => s.archetype)).toEqual(["dice", "melee"]);
    expect(withDice[0].dice).toBeDefined();
    expect(mapAction(action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } })).map((s) => s.archetype)).toEqual(["melee"]);
    expect(mapAction(action({ isCancelled: true, actionDetails: { diceRolls: rolls } }))).toEqual([]);
  });
});
