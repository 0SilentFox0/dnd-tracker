import { describe, expect, it } from "vitest";

import { formatMechanicsSkill, skillSearchText } from "@/lib/utils/info-reference";
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
