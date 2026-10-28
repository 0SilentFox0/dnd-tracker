import { describe, expect, it } from "vitest";

import { classSearchText, formatMechanicsSkill, skillSearchText, toClassForReference } from "@/lib/utils/campaigns/info-reference";
import type { GameClassData } from "@/types/classes";
import type { SkillForReference } from "@/types/info-reference";

const skill = (abilitySummary: string[]): SkillForReference => ({
  id: "s", name: "Лють", description: null, appearanceDescription: null, abilitySummary, mainSkillId: null, mainSkillName: "Бій", mainSkillIcon: null, mainSkillColor: null, grantedSpellName: null, icon: null, image: null,
});

describe("довідка скілів", () => {
  it("механіка скіла — з опису умінь", () => {
    expect(formatMechanicsSkill(skill(["Пасивно · шкода (ближня) +10%"]))).toBe("Гілка: Бій. Вміння: Пасивно · шкода (ближня) +10%");
  });

  it("пошук знаходить за текстом умінь", () => {
    expect(skillSearchText(skill(["Пасивно · шкода (ближня) +10%"]))).toContain("ближня");
  });
});

describe("toClassForReference", () => {
  const base = { id: "c", name: "Жрець", icon: null, color: null, hitDie: 8 as const, savingThrows: ["wisdom" as const], proficiencies: { armor: ["Легкі"], weapons: [], tools: [] }, skillChoices: { count: 2, from: ["Медицина"] }, caster: "full" as const, spellcastingAbility: "wisdom" as const, features: [{ level: 3, abilities: [{ id: "a", name: "B", description: "bb" }, { id: "b", name: "A" }] }, { level: 1, description: "Опис", abilities: [] }], subclassLevel: 3, subclasses: [] };

  it("збирає короткий опис і сортує вміння за рівнем", () => {
    const c = toClassForReference(base as unknown as GameClassData);

    expect(c.summary).toEqual(expect.arrayContaining(["Кістка здоров'я: к8", "Рятівні кидки: Мудрість", "Обладунки: Легкі"]));
    expect(c.features.map((f) => f.level)).toEqual([1, 3, 3]);
    expect(classSearchText(c)).toContain("медицина");
  });
});
