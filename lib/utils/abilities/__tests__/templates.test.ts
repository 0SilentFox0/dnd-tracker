import { describe, expect, it } from "vitest";

import { describeAbility } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

describe("templates", () => {
  it("кожен шаблон валідний і має опис", () => {
    expect(ABILITY_TEMPLATES.map((t) => t.id)).toEqual(["stats", "damage", "onHit", "resistance", "aura", "survive", "bonusAction", "spellSlots", "custom"]);

    for (const t of ABILITY_TEMPLATES) {
      const a = { id: "a1", ...t.build() };

      expect(AbilitySchema.safeParse(a).success, t.id).toBe(true);
      expect(describeAbility(a).length).toBeGreaterThan(0);
    }
  });
});
