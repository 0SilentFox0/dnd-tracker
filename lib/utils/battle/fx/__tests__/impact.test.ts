import { describe, expect, it } from "vitest";

import { action } from "./action-fixture";

import { ARCHETYPE_FX, FX_ARCHETYPES, impactFor as impactForSpec, mapAction } from "@/lib/utils/battle/fx";
import type { BattleAction } from "@/types/battle";

const impactFor = (action: BattleAction | undefined, id: string) => impactForSpec(action ? mapAction(action)[0] : undefined, id);

describe("impactFor", () => {
  it("fire bolt target → fire damage after the bolt", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactFor(a, "t")).toEqual({ element: "fire", kind: "damage", delayMs: ARCHETYPE_FX.bolt.impactMs });
  });

  it("heal spell target → kind heal", () => {
    const a = action({ actionType: "spell", actionDetails: { spellEffectKinds: ["heal"] } });

    expect(impactFor(a, "t")).toMatchObject({ kind: "heal", delayMs: ARCHETYPE_FX.heal.impactMs });
  });

  it("melee physical hit → attack melee", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "slashing" }] } });

    expect(impactFor(a, "t")).toMatchObject({ element: "physical", attack: "melee" });
  });

  it("ranged physical hit → attack ranged", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: true, damageRolls: [{ dice: "1d8", results: [5], total: 5, damageType: "piercing" }] } });

    expect(impactFor(a, "t")).toMatchObject({ element: "physical", attack: "ranged" });
  });

  it("spell bolt → no attack kind", () => {
    const a = action({ actionType: "spell", actionDetails: { spellDamageType: "fire", spellEffectKinds: ["dealDamage"] } });

    expect(impactFor(a, "t")?.attack).toBeUndefined();
  });

  it("miss → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "ranged", isHit: false } });

    expect(impactFor(a, "t")).toBeNull();
  });

  it("non-target and no action → null", () => {
    const a = action({ actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

    expect(impactFor(a, "x")).toBeNull();
    expect(impactFor(undefined, "t")).toBeNull();
  });

  it("buff/debuff → null (no damage frame borrowed)", () => {
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["modifyStat"] } }), "t")).toBeNull();
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellEffectKinds: ["applyCondition"] } }), "t")).toBeNull();
  });

  it("eldritch borrows the fire frame at its own impact time; slow, haste and stoneskin have none", () => {
    const cast = (spellName: string, actionDetails: Record<string, unknown>) => impactFor(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }), "t");

    expect(cast("Потойбічна стріла", { spellDamageType: "fire", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toEqual({ element: "fire", kind: "damage", delayMs: ARCHETYPE_FX.eldritch.impactMs });
    expect(cast("Сповільнення", { spellEffectKinds: ["modifyStat"] })).toBeNull();
    expect(cast("Поспіх", { spellEffectKinds: ["modifyStat"] })).toBeNull();
    expect(cast("Кам'яна шкіра", { spellEffectKinds: ["modifyStat"] })).toBeNull();
  });

  it("Dark: plague and the netherworld curse keep their damage frames, the other curses have none", () => {
    const cast = (spellName: string, actionDetails: Record<string, unknown>) => impactFor(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }), "t");

    expect(cast("Чума", { spellDamageType: "poison", spellEffectKinds: ["dot"] })).toEqual({ element: "poison", kind: "damage", delayMs: ARCHETYPE_FX.pestilence.impactMs });
    expect(cast("Прокляття Потойбіччя", { spellDamageType: "necrotic", spellEffectKinds: ["dealDamage"], totalDamage: 20 })).toEqual({ element: "necrotic", kind: "damage", delayMs: ARCHETYPE_FX.netherhands.impactMs });

    for (const name of ["Ослаблення", "Немічність", "Розсіяність", "Страждання", "Смуток", "Сліпота", "Ляльковод"]) expect(cast(name, { spellEffectKinds: ["modifyStat"] })).toBeNull();
  });

  it("Light: the smites hit with radiant damage, sunbeam and resurrection heal, the wards and blessings have no frame", () => {
    const cast = (spellName: string, actionDetails: Record<string, unknown>) => impactFor(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }), "t");

    const smite = { spellDamageType: "radiant", spellEffectKinds: ["dealDamage"], totalDamage: 20 };

    expect(cast("Слово світла", smite)).toEqual({ element: "radiant", kind: "damage", delayMs: ARCHETYPE_FX.holyword.impactMs });
    expect(cast("Божественна відплата", smite)).toEqual({ element: "radiant", kind: "damage", delayMs: ARCHETYPE_FX.retribution.impactMs });
    expect(cast("Вічне світло", { spellEffectKinds: ["heal", "hot"], totalHealing: 9 })).toMatchObject({ kind: "heal", delayMs: ARCHETYPE_FX.sunbeam.impactMs });
    expect(cast("Воскресіння", { spellEffectKinds: ["heal"], totalHealing: 9 })).toMatchObject({ kind: "heal", delayMs: ARCHETYPE_FX.resurrect.impactMs });

    for (const name of ["Очищення", "Регенерація", "Праведна міць", "Ухилення", "Божественна сила", "Магічний імунітет"]) expect(cast(name, { spellEffectKinds: ["modifyStat"] })).toBeNull();
  });

  it("summons never play a hit frame on the caster", () => {
    const cast = (spellName: string) => impactFor(action({ actionType: "spell", actionDetails: { spellName, spellEffectKinds: ["summon"] } }), "t");

    for (const name of ["Прикликання елементаля: Вогонь", "Прикликання елементаля: Вода", "Прикликання елементаля: Земля", "Прикликання елементаля: Повітря", "Призив Фенікса", "Аватар", "Інший призов"]) expect(cast(name)).toBeNull();
  });

  it("Nature: the heals keep the heal frame, vines poison, moonbeam radiant; the spirit and vampirism have none", () => {
    const cast = (spellName: string, actionDetails: Record<string, unknown>) => impactFor(action({ actionType: "spell", actionDetails: { spellName, ...actionDetails } }), "t");

    const healing = { spellEffectKinds: ["heal"], totalHealing: 9 };

    expect(cast("Слово лікування", healing)).toEqual({ element: "nature", kind: "heal", delayMs: ARCHETYPE_FX.healword.impactMs });
    expect(cast("Хвиля зцілення", healing)).toMatchObject({ kind: "heal", delayMs: ARCHETYPE_FX.healwave.impactMs });
    expect(cast("Відродження лісу", healing)).toMatchObject({ kind: "heal", delayMs: ARCHETYPE_FX.rebirth.impactMs });
    expect(cast("Колючі лози", { spellDamageType: "poison", spellEffectKinds: ["dot"] })).toEqual({ element: "poison", kind: "damage", delayMs: ARCHETYPE_FX.thornvines.impactMs });
    expect(cast("Місячний промінь", { spellDamageType: "radiant", spellEffectKinds: ["dealDamage"], totalDamage: 9 })).toEqual({ element: "radiant", kind: "damage", delayMs: ARCHETYPE_FX.moonbeam.impactMs });
    expect(cast("Дух лісу", { spellEffectKinds: ["hot"] })).toBeNull();
    expect(cast("Вампіризм", { spellEffectKinds: ["flag"] })).toBeNull();
  });

  it("teleport, entangle and a death never borrow a damage frame", () => {
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellName: "Телепортація", spellEffectKinds: ["note"] } }), "t")).toBeNull();
    expect(impactFor(action({ actionType: "spell", actionDetails: { spellName: "Корені", spellEffectKinds: ["applyCondition"] } }), "t")).toBeNull();
    expect(impactForSpec({ key: "k", archetype: "death", element: "necrotic", actorId: "a", actorSide: "player", targetIds: ["t"], hit: true, critical: false }, "t")).toBeNull();
  });

  it("every archetype that frames a hit lands it after its own impact time", () => {
    for (const archetype of FX_ARCHETYPES) {
      const { impact, impactMs } = ARCHETYPE_FX[archetype];

      const got = impactForSpec({ key: "k", archetype, element: "fire", actorId: "a", actorSide: "player", targetIds: ["t"], hit: true, critical: false }, "t");

      expect(got && { kind: got.kind, delayMs: got.delayMs }).toEqual(impact === "none" ? null : { kind: impact, delayMs: impactMs });
    }
  });
});

