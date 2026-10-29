import { describe, expect, it } from "vitest";

import { ukT } from "./describe-fixtures";

import { describeAbilityText } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

const t = await ukT();

describe("templates", () => {
  it("кожен шаблон валідний і має опис", () => {
    expect(ABILITY_TEMPLATES.map((t) => t.id)).toEqual(["stats", "damage", "onHit", "resistance", "aura", "survive", "bonusAction", "spellSlots", "custom"]);

    for (const tpl of ABILITY_TEMPLATES) {
      const a = { id: "a1", ...tpl.build({ name: "n", note: "t" }) };

      expect(AbilitySchema.safeParse(a).success, tpl.id).toBe(true);
      expect(describeAbilityText(a, t).length).toBeGreaterThan(0);
    }
  });
});
