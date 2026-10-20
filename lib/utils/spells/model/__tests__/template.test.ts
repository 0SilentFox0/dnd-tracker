import { describe, expect, it } from "vitest";

import { formToPayload, spellFormError, spellToForm } from "@/lib/utils/spells/model/form";
import { targetingLabel } from "@/lib/utils/spells/model/labels";
import { SpellTargetingSchema } from "@/lib/utils/spells/model/schema";
import type { Spell } from "@/types/spells";

const template = { kind: "template", shape: "cone", size: 15, side: "enemy", maxTargets: 4, range: 60, zone: { rounds: 3, label: "Вогонь" } } as const;

const row: Spell = {
  id: "s1",
  name: "Стіна вогню",
  level: 3,
  description: null,
  groupId: null,
  icon: null,
  dice: 2,
  cost: "action",
  targeting: template,
  resolution: { kind: "auto" },
  spellEffects: [],
  raceModifiers: [],
  stackable: false,
  maxStacks: null,
};

describe("шаблон, дальність і зона заклинання", () => {
  it("схема приймає template з range і zone", () => {
    expect(SpellTargetingSchema.safeParse(template).success).toBe(true);
    expect(SpellTargetingSchema.safeParse({ kind: "enemy", range: 30 }).success).toBe(true);
  });

  it("схема відхиляє size 0, невідому форму та zone поза template", () => {
    expect(SpellTargetingSchema.safeParse({ ...template, size: 0 }).success).toBe(false);
    expect(SpellTargetingSchema.safeParse({ ...template, shape: "star" }).success).toBe(false);
    expect(SpellTargetingSchema.safeParse({ ...template, zone: { rounds: 0 } }).success).toBe(false);

    const area = SpellTargetingSchema.parse({ kind: "area", side: "enemy", maxTargets: 2, zone: { rounds: 2 } });

    expect(area).not.toHaveProperty("zone");
  });

  it("round-trip форми зберігає template, range і zone", () => {
    const form = spellToForm(row);

    expect(form.targeting).toEqual(template);
    expect(formToPayload(form).targeting).toEqual(template);
    expect(spellFormError(form)).toBeNull();
  });

  it("форма з некоректним розміром має помилку", () => {
    expect(spellFormError({ ...spellToForm(row), targeting: { ...template, size: 0 } })).not.toBeNull();
  });

  it("лейбли", () => {
    expect(targetingLabel(template)).toBe("Конус 15 фт");
    expect(targetingLabel({ ...template, shape: "circle", size: 10 })).toBe("Коло 10 фт");
  });
});
