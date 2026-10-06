import { describe, expect, it } from "vitest";

import { damageSkillsFromProgression } from "@/lib/hooks/characters/useDamageCalculator-skills";

describe("damageSkillsFromProgression", () => {
  it("лише вивчені скіли з affectsDamage, тип шкоди з damageAffinity", () => {
    const skills = {
      a: { name: "Кровопуск", damageAffinity: { affectsDamage: true, damageType: "melee" } },
      b: { name: "Щит", damageAffinity: { affectsDamage: false, damageType: null } },
      c: { name: "Не вивчено", damageAffinity: { affectsDamage: true, damageType: null } },
    } as never;

    expect(damageSkillsFromProgression(["a", "b"], skills)).toEqual([{ id: "a", name: "Кровопуск", damageType: "melee" }]);
  });
});
