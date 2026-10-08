import { describe, expect, it } from "vitest";

import { spellLevelOptions } from "@/app/campaigns/[id]/dm/spells/spell-form-defaults";
import { defaultSpellForm, formToPayload, spellFormError, spellToForm } from "@/lib/utils/spells/model/form";
import type { Spell } from "@/types/spells";

const row: Spell = {
  id: "s1",
  name: "Вогняна куля",
  level: 3,
  description: "Що робить",
  appearanceDescription: "Як виглядає",
  groupId: "chaos",
  icon: null,
  dice: 4,
  cost: "action",
  targeting: { kind: "area", side: "enemy", maxTargets: 4 },
  resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
  raceModifiers: [{ raceId: "human", percent: -100 }],
  stackable: true,
  maxStacks: 3,
};

describe("форма заклинання", () => {
  it("рядок → форма → payload API зберігає всю модель", () => {
    const payload = formToPayload(spellToForm(row));

    expect(payload).toMatchObject({
      name: "Вогняна куля",
      level: 3,
      groupId: "chaos",
      description: "Що робить",
      appearanceDescription: "Як виглядає",
      dice: 4,
      cost: "action",
      targeting: row.targeting,
      resolution: row.resolution,
      spellEffects: row.spellEffects,
      raceModifiers: row.raceModifiers,
      stackable: true,
      maxStacks: 3,
    });
    expect(formToPayload({ ...spellToForm(row), stackable: false })).toMatchObject({ stackable: false, maxStacks: null });
  });

  it("порожня форма: за замовчуванням ворог, auto, без ефектів; потрібна назва", () => {
    expect(defaultSpellForm()).toMatchObject({ targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [], dice: 0 });
    expect(spellFormError(defaultSpellForm())).toBe("Вкажіть назву заклинання");
    expect(spellFormError({ ...defaultSpellForm(), name: "Іскра" })).toBeNull();
  });

  it("помилку дає невалідний ефект", () => {
    const form = { ...defaultSpellForm(), name: "Іскра", spellEffects: [{ kind: "teleport" } as never] };

    expect(spellFormError(form)).toContain("effects");
  });

  it("зіпсовані колонки рядка не ламають редактор", () => {
    const form = spellToForm({ ...row, targeting: { kind: "area" }, spellEffects: "oops", raceModifiers: null });

    expect(form).toMatchObject({ targeting: { kind: "enemy" }, spellEffects: [], raceModifiers: [] });
  });

  it("рівень 0 лишається лише у старого заклинання; у списку для нового — 1–5", () => {
    expect(formToPayload(spellToForm({ ...row, level: 0 })).level).toBe(0);
    expect(spellLevelOptions().map((o) => o.value)).toEqual(["1", "2", "3", "4", "5"]);
    expect(spellLevelOptions(0).map((o) => o.value)).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(spellLevelOptions(3).map((o) => o.value)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
