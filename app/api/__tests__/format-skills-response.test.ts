import { describe, expect, it } from "vitest";

import { formatSkillResponse } from "@/lib/server/skills/format-skill-response";
import { formatSkillsListResponse } from "@/lib/server/skills/format-skills-response";

const row = {
  id: "s1", campaignId: "c", name: "Скіл", description: null, icon: "https://x/i.png", spellId: "sp1", spellGroupId: null, grantedSpellId: null,
  mainSkillId: "attack",
  spellNewSpellId: null, image: null, createdAt: new Date(), abilities: null,
};

describe("formatSkillsListResponse", () => {
  it("пласкі колонки скіла, як у Skill", () => {
    const [s] = formatSkillsListResponse([row]);

    expect(s).toMatchObject({ name: "Скіл", description: null, icon: "https://x/i.png", spellId: "sp1", spellGroupId: null, grantedSpellId: null, mainSkillId: "attack" });
    expect(s.abilitySummary).toEqual([]);
  });

  it("у списку немає важких і legacy-полів", () => {
    const [s] = formatSkillsListResponse([row]);

    for (const key of ["abilities", "damageAffinity", "basicInfo", "bonuses", "combatStats", "skillTriggers", "spellNewSpellId"]) expect(s).not.toHaveProperty(key);
  });
});

describe("formatSkillResponse", () => {
  it("NULL abilities → порожній список без плашки", () => {
    const s = formatSkillResponse(row);

    expect(s.abilities).toEqual([]);
    expect(s.abilityIssues).toEqual([]);
    expect(s.name).toBe("Скіл");
  });
});
