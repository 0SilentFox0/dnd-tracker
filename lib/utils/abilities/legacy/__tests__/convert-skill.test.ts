import { describe, expect, it } from "vitest";

import { convertLegacySkill } from "@/lib/utils/abilities/legacy/convert-skill";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const row = (over: Partial<Parameters<typeof convertLegacySkill>[0]>) => ({ id: "s1", name: "Скіл", combatStats: {}, bonuses: {}, skillTriggers: [], ...over });

describe("convertLegacySkill", () => {
  it("пасивка: шкода ближня % з тип-фільтром скіла і резист", () => {
    const r = convertLegacySkill(
      row({
        combatStats: {
          affectsDamage: true,
          damageType: "melee",
          effects: [
            { stat: "all_damage", type: "percent", value: 15 },
            { stat: "physical_resistance", type: "percent", value: 10 },
          ],
        },
        skillTriggers: [{ type: "simple", trigger: "passive" }],
      }),
    );

    expect(r.abilities).toEqual([
      {
        id: "t0",
        name: "Скіл",
        trigger: { event: "passive" },
        effects: [
          { kind: "damageBonus", filter: { kind: "melee" }, percent: 15 },
          { kind: "flag", flag: "resistance", damageType: "physical", percent: 10 },
        ],
      },
    ]);
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("onHit + бонус шкоди → attack/before + DOT на ціль, ліміти й шанс", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "melee_damage", type: "percent", value: 20 }, { stat: "bleed_damage", type: "dice", value: "1d4", duration: 2 }] },
        skillTriggers: [{ type: "simple", trigger: "onHit", modifiers: { probability: 0.3, oncePerBattle: true } }],
      }),
    );

    expect(r.abilities).toEqual([
      {
        id: "t0",
        name: "Скіл",
        trigger: { event: "hit", role: "attacker" },
        limits: { perBattle: 1, chance: 30 },
        effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }],
      },
      {
        id: "t0-before",
        name: "Скіл",
        trigger: { event: "attack", phase: "before", role: "attacker" },
        limits: { perBattle: 1, chance: 30 },
        effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 20 }],
      },
    ]);
    expect(r.issues.map((i) => i.severity)).toContain("behavior");
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("beforeEnemyAttack → role target (зміна поведінки)", () => {
    const r = convertLegacySkill(row({ combatStats: { effects: [{ stat: "armor", type: "flat", value: 2 }] }, skillTriggers: [{ type: "simple", trigger: "beforeEnemyAttack" }] }));

    expect(r.abilities[0].trigger).toEqual({ event: "attack", phase: "before", role: "target" });
    expect(r.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "armor", flat: 2 }]);
    expect(r.issues.some((i) => i.message.includes("beforeEnemyAttack"))).toBe(true);
  });

  it("complex allyHP <= 0.15 → turnStart + hpBelow 15", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "hp_bonus", type: "flat", value: 5, target: "all_allies" }] },
        skillTriggers: [{ type: "complex", target: "ally", operator: "<=", value: 0.15, valueType: "percent", stat: "HP" }],
      }),
    );

    expect(r.abilities[0]).toMatchObject({ trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "anyAlly", percent: 15 } });
    expect(r.abilities[0].effects).toEqual([{ kind: "heal", amount: 5, target: "allAllies" }]);
  });

  it("onFirstHitTakenPerRound + counter_damage → пасивна контратака", () => {
    const r = convertLegacySkill(
      row({ combatStats: { effects: [{ stat: "counter_damage", type: "percent", value: 30 }] }, skillTriggers: [{ type: "simple", trigger: "onFirstHitTakenPerRound", modifiers: { responseType: "ranged" } }] }),
    );

    expect(r.abilities).toEqual([
      { id: "counter", name: "Скіл", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 30 }] },
    ]);
  });

  it("morale_per_kill і max_targets стають окремими вміннями незалежно від тригера", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "morale_per_kill", type: "flat", value: 1 }, { stat: "max_targets", type: "flat", value: 1 }] },
        skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
      }),
    );

    expect(r.abilities).toEqual([
      { id: "x0", name: "Скіл", trigger: { event: "kill", role: "killerSide" }, effects: [{ kind: "changeMorale", delta: 1 }] },
      { id: "x1", name: "Скіл", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxTargets", flat: 1 }] },
    ]);
  });

  it("battleStart initiative за замовчуванням на союзників; текстова умова → note + issue", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "initiative", type: "flat", value: 2 }] },
        skillTriggers: [{ type: "simple", trigger: "onBattleStart", modifiers: { condition: "onConsumeDead" } }],
      }),
    );

    expect(r.abilities[0].effects).toEqual([
      { kind: "modifyStat", stat: "initiative", flat: 2, target: "allAllies", duration: { rounds: 99 } },
      { kind: "note", text: "Умова: onConsumeDead" },
    ]);
    expect(r.issues.some((i) => i.severity === "loss")).toBe(true);
  });

  it("скіл без тригерів → пасивка; невідомий стат → note + issue", () => {
    const r = convertLegacySkill(row({ bonuses: { melee_damage: 10, weird_stat: 3 } }));

    expect(r.abilities[0].trigger).toEqual({ event: "passive" });
    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }, { kind: "note", text: "weird_stat: 3" }]),
    );
    expect(r.issues.some((i) => i.message.includes("weird_stat"))).toBe(true);
  });

  it("школа магії зі skill.spellGroupId", () => {
    const r = convertLegacySkill(row({ spellGroupId: "chaos", combatStats: { effects: [{ stat: "magic_damage", type: "percent", value: 25 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }));

    expect(r.abilities[0].effects[0]).toEqual({ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 25 });
  });

  it("skipBakedStats пропускає запечені стати", () => {
    const r = convertLegacySkill(row({ combatStats: { effects: [{ stat: "hp_bonus", type: "flat", value: 5 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }), { skipBakedStats: true });

    expect(r.abilities).toEqual([]);
  });

  it("звіт позначає зміни поведінки: подійний бонус шкоди, damage→all, пасивна броня", () => {
    const onKill = convertLegacySkill(row({ combatStats: { effects: [{ stat: "melee_damage", type: "percent", value: 10 }] }, skillTriggers: [{ type: "simple", trigger: "onKill" }] }));

    const dmg = convertLegacySkill(row({ combatStats: { effects: [{ stat: "damage", type: "flat", value: 2 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }));

    const armor = convertLegacySkill(row({ combatStats: { effects: [{ stat: "armor", type: "flat", value: 1 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }));

    for (const r of [onKill, dmg, armor]) expect(r.issues.some((i) => i.severity === "behavior")).toBe(true);
  });
  it("combatStats.min_targets/max_targets → пасивні цілі + behavior issue", () => {
    const r = convertLegacySkill(row({ combatStats: { min_targets: 1, max_targets: 2, effects: [] } }));

    expect(r.abilities).toContainEqual({
      id: "targets",
      name: "Скіл",
      trigger: { event: "passive" },
      effects: [
        { kind: "modifyStat", stat: "minTargets", flat: 1 },
        { kind: "modifyStat", stat: "maxTargets", flat: 2 },
      ],
    });
    expect(r.issues.some((i) => i.message.includes("цілей"))).toBe(true);
  });
});
