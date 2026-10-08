import { describe, expect, it } from "vitest";

import { formatSkillResponse } from "@/app/api/campaigns/[id]/skills/[skillId]/format-skill-response";
import { formatSkillsListResponse } from "@/app/api/campaigns/[id]/skills/format-skills-response";

const row = {
  id: "s1", campaignId: "c", name: "Скіл", description: null, icon: "https://x/i.png", spellId: "sp1", spellGroupId: null, grantedSpellId: null,
  mainSkillId: "attack",
  spellNewSpellId: null, image: null, createdAt: new Date(), abilities: null,
};

describe("formatSkillsListResponse", () => {
  it("згруповані поля будуються з пласких колонок", () => {
    const [s] = formatSkillsListResponse([row]);

    expect(s.basicInfo).toEqual({ name: "Скіл", description: "", icon: "https://x/i.png" });
    expect(s.spellData).toEqual({ spellId: "sp1", spellGroupId: undefined, grantedSpellId: undefined });
    expect(s.mainSkillData).toEqual({ mainSkillId: "attack" });
  });

  it("legacy-полів у відповіді немає", () => {
    const [s] = formatSkillsListResponse([row]);

    for (const key of ["bonuses", "combatStats", "skillTriggers"]) expect(s).not.toHaveProperty(key);
  });
});

describe("formatSkillResponse", () => {
  it("NULL abilities → порожній список без плашки", () => {
    const s = formatSkillResponse(row);

    expect(s.abilities).toEqual([]);
    expect(s.abilityIssues).toEqual([]);
    expect(s.basicInfo.name).toBe("Скіл");
  });
});
