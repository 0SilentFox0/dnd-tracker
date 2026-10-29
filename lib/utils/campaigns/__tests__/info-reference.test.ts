import { describe, expect, it, vi } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import type { Translator } from "@/lib/i18n/translator";
import type { Segment } from "@/lib/utils/abilities/segments";
import { classSearchText, classSummaryText, formatMechanicsSkill, formatMechanicsSpell, skillSearchText, toClassForReference } from "@/lib/utils/campaigns/info-reference";
import type { GameClassData } from "@/types/classes";
import type { SkillForReference } from "@/types/info-reference";

const t = makeT();

const line = (value: string) => [{ key: "summary.text", params: { value } }];

const skill = (abilitySummary: Segment[][]): SkillForReference => ({
  id: "s", name: "Лють", description: null, appearanceDescription: null, abilitySummary, mainSkillId: null, mainSkillName: "Бій", mainSkillIcon: null, mainSkillColor: null, grantedSpellName: null, icon: null, image: null,
});

describe("довідка скілів", () => {
  it("механіка скіла — з опису умінь", () => {
    expect(formatMechanicsSkill(skill([line("шкода ближня +10%")]), t)).toBe(
      'dashboard.reference.mechanics.branch {"name":"Бій"}. dashboard.reference.mechanics.abilities {"list":"abilityRegistry.summary.text {\\"value\\":\\"шкода ближня +10%\\"}"}',
    );
  });

  it("пошук знаходить за текстом умінь", () => {
    expect(skillSearchText(skill([line("шкода ближня +10%")]), t)).toContain("ближня");
  });
});

describe("toClassForReference", () => {
  const base = { id: "c", name: "Жрець", icon: null, color: null, hitDie: 8 as const, savingThrows: ["wisdom" as const], proficiencies: { armor: ["Легкі"], weapons: [], tools: [] }, skillChoices: { count: 2, from: ["Медицина"] }, caster: "full" as const, spellcastingAbility: "wisdom" as const, features: [{ level: 3, abilities: [{ id: "a", name: "B", description: "bb" }, { id: "b", name: "A" }] }, { level: 1, description: "Опис", abilities: [] }], subclassLevel: 3, subclasses: [] };

  it("віддає зведення ключами з id-параметрами і сортує вміння за рівнем", () => {
    const c = toClassForReference(base as unknown as GameClassData);

    expect(c.summary).toEqual([
      { key: "hitDie", params: { die: 8 } },
      { key: "savingThrows", params: { list: "wisdom" } },
      { key: "casterAbility", params: { caster: "full", ability: "wisdom" } },
      { key: "armor", params: { list: "Легкі" } },
      { key: "skills", params: { count: 2, list: "Медицина" } },
    ]);
    expect(c.features.map((f) => f.level)).toEqual([1, 3, 3]);
    expect(classSearchText(c, t)).toContain("медицина");
  });

  it("з реальним uk-каталогом зведення читається як раніше", async () => {
    const { getTranslator } = await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator");

    const real: Translator = await getTranslator("uk");

    const c = toClassForReference(base as unknown as GameClassData);

    expect(c.summary.map((line) => classSummaryText(real, line))).toEqual(["Кістка здоров'я: к8", "Рятівні кидки: Мудрість", "Повний заклинач (Мудрість)", "Обладунки: Легкі", "Навички: 2 з Медицина"]);
    expect(formatMechanicsSpell({ level: 3, type: "Ціль", dice: 2, resolution: "Спас", cost: "1 дія" } as never, real)).toBe("Третє коло, Ціль. Кубики: 2к. Перевірка: Спас. Вартість: 1 дія");
  });
});
