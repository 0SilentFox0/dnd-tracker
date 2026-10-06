/**
 * Тести magic-damage pipeline:
 *  - експерт "Магія хаосу" дає +25% до шкоди заклинання,
 *  - school scope filter обмежує бонус відповідною школою магії,
 *  - spellEffectIncrease (апгрейд заклинання) застосовується після %-бонусу скіла,
 *  - melee/ranged бонуси не впливають на magic.
 */

import { describe, expect, it } from "vitest";

import { calculateSpellDamageWithEnhancements } from "../calculations";

import { pickHighestPerLine, resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { SpellEnhancer } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import { SkillLevel } from "@/types/skill-tree";

interface TestSkill {
  id: string;
  name: string;
  mainSkillId: string;
  level: SkillLevel;
  kind: "melee" | "ranged" | "magic";
  school?: string;
  percent?: number;
  flat?: number;
  spellEffectIncrease?: number;
}

function createCaster(overrides?: { skills?: TestSkill[]; level?: number }): BattleParticipant {
  const base = createMockParticipant();

  const picked = pickHighestPerLine(
    (overrides?.skills ?? []).map((s) => ({
      item: s,
      source: { type: "skill" as const, id: s.id, name: s.name, icon: null, line: { mainSkillId: s.mainSkillId, level: s.level, levelNode: true } },
    })),
  );

  const resolvedAbilities = picked.flatMap(({ item: s, source }) =>
    resolveAbilities(source, [
      {
        id: "t0",
        name: s.name,
        trigger: { event: "passive" },
        effects: [{ kind: "damageBonus", filter: { kind: s.kind, ...(s.school && { school: s.school }) }, ...(s.percent !== undefined ? { percent: s.percent } : { flat: s.flat ?? 0 }) }],
      },
    ]),
  );

  const spellEnhancers: SpellEnhancer[] = picked
    .filter(({ item }) => item.spellEffectIncrease !== undefined)
    .map(({ item: s }) => ({ skillId: s.id, name: s.name, mainSkillId: s.mainSkillId, level: s.level, linkedSpellId: null, spellGroupId: s.school ?? null, spellEnhancements: { spellEffectIncrease: s.spellEffectIncrease } }));

  return createMockParticipant({
    basicInfo: { ...base.basicInfo, id: "caster", controlledBy: "user", name: "Hero" },
    abilities: { ...base.abilities, level: overrides?.level ?? 5, strength: 10, dexterity: 10, modifiers: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 } },
    combatStats: { ...base.combatStats, maxHp: 30, currentHp: 30 },
    battleData: { ...base.battleData, resolvedAbilities, spellEnhancers },
  });
}

function chaosExpertSkill(): TestSkill {
  return { id: "chaos-expert", name: "Магія хаосу: експерт", mainSkillId: "main-chaos", level: SkillLevel.EXPERT, kind: "magic", school: "chaos", percent: 25 };
}

describe("calculateSpellDamageWithEnhancements (magic pipeline)", () => {
  it("expert 'Магія хаосу' дає +25% до шкоди заклинання школи Хаосу", () => {
    const caster = createCaster({ skills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      // baseDamage (сума кубиків заклинання)
      40,
      undefined,
      // не додаємо рівень героя у цьому кейсі
      undefined,
      { groupId: "chaos" },
    );

    // 40 (база) + 0 (немає spellcasting modifier) → 40 → +25% (10) → 50
    expect(result.totalDamage).toBe(50);
    expect(result.breakdown.some((l) => l.includes("25%"))).toBe(true);
  });

  it("скіл Хаосу не дає бонус заклинанню Темної магії (school scope)", () => {
    const caster = createCaster({ skills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "dark" }, // інша школа
    );

    expect(result.totalDamage).toBe(40);
    expect(result.breakdown.some((l) => l.includes("25%"))).toBe(false);
  });

  it("без spellGroupId у спела — фолбек: бонус застосовується (зворотна сумісність)", () => {
    const caster = createCaster({ skills: [chaosExpertSkill()] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      undefined, // невідома школа цілі
    );

    expect(result.totalDamage).toBe(50);
  });

  it("універсальний скіл (spell_damage без spellGroupId) застосовується до будь-якої школи", () => {
    const universalSkill: TestSkill = { id: "universal", name: "Магія: експерт", mainSkillId: "main-magic", level: SkillLevel.EXPERT, kind: "magic", percent: 25 };

    const caster = createCaster({ skills: [universalSkill] });

    const r1 = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    const r2 = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "dark" },
    );

    expect(r1.totalDamage).toBe(50);
    expect(r2.totalDamage).toBe(50);
  });

  it("expert > basic на одному mainSkillId — береться лише найвищий", () => {
    const basic: TestSkill = { id: "chaos-basic", name: "Магія хаосу: базовий", mainSkillId: "main-chaos", level: SkillLevel.BASIC, kind: "magic", school: "chaos", percent: 10 };

    const caster = createCaster({
      skills: [basic, chaosExpertSkill()],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // експерт +25% (а не basic +10%)
    expect(result.totalDamage).toBe(50);
  });

  it("spellEffectIncrease застосовується після %-бонусу зі скіла (множить вже збільшений урон)", () => {
    const skillWithIncrease: TestSkill = { ...chaosExpertSkill(), id: "chaos-with-incr", spellEffectIncrease: 20 };

    const caster = createCaster({ skills: [skillWithIncrease] });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // 40 → +25% → 50 → +20% від 50 (10) → 60
    expect(result.totalDamage).toBe(60);
  });

  it("melee/ranged скіл не впливає на magic", () => {
    const meleeSkill: TestSkill = { id: "melee", name: "Меч-мастер: експерт", mainSkillId: "main-melee", level: SkillLevel.EXPERT, kind: "melee", percent: 25 };

    const rangedSkill: TestSkill = { id: "ranged", name: "Стрілець: експерт", mainSkillId: "main-ranged", level: SkillLevel.EXPERT, kind: "ranged", percent: 25 };

    const caster = createCaster({
      skills: [meleeSkill, rangedSkill],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    expect(result.totalDamage).toBe(40);
  });

  it("addHeroLevelToBase=true додає рівень героя у базу", () => {
    const caster = createCaster({
      skills: [chaosExpertSkill()],
      level: 8,
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      { addHeroLevelToBase: true },
      { groupId: "chaos" },
    );

    // 40 (кубики) + 8 (рівень) + 25% від 40 = +10 → 58
    // %-бонус застосовується ДО суми кубиків, не до (кубики + рівень).
    expect(result.totalDamage).toBe(58);
  });

  it("flat-бонус застосовується до бази перед відсотками", () => {
    const flatSkill: TestSkill = { id: "flat-magic", name: "Магічна сила", mainSkillId: "main-magic-flat", level: SkillLevel.EXPERT, kind: "magic", flat: 5 };

    const caster = createCaster({
      skills: [flatSkill, chaosExpertSkill()],
    });

    const result = calculateSpellDamageWithEnhancements(
      caster,
      40,
      undefined,
      undefined,
      { groupId: "chaos" },
    );

    // 40 (кубики) + 5 (flat) + 25% від 40 = +10 → 55
    // %-бонус прив'язаний до бази кубиків (40), а не до running після flat.
    expect(result.totalDamage).toBe(55);
  });
});
