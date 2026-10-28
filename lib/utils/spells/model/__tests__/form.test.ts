import { describe, expect, it } from "vitest";

import { spellLevelOptions } from "@/components/spells/form/spell-form-defaults";
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
  it("preserves reaction and long casting time through form and API payload", () => {
    expect(formToPayload(spellToForm({ ...row, cost: "reaction", casting: { trigger: "when hit" } } as never))).toMatchObject({ cost: "reaction", casting: { trigger: "when hit" } });
    expect(formToPayload(spellToForm({ ...row, cost: "long", casting: { rounds: 100, text: "10 minutes" } } as never))).toMatchObject({ cost: "long", casting: { rounds: 100, text: "10 minutes" } });
  });
  it("preserves fixedDice and damageBonus when editing", () => {
    expect(formToPayload(spellToForm({ ...row, fixedDice: true, damageBonus: -3 }))).toMatchObject({ fixedDice: true, damageBonus: -3 });
  });
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

    expect(spellFormError(form)).toContain("Ефекти");
  });

  it("spellFormError ловить усе, що відхилить схема, з назвою поля", () => {
    const base = { ...defaultSpellForm(), name: "Іскра" };

    const message = spellFormError({ ...base, targeting: { kind: "enemy", range: 1 } as never });

    expect(message).toMatch(/^Дальність: /);
    expect(message).not.toContain("targeting");
    expect(spellFormError({ ...base, name: "а".repeat(101) })).toMatch(/^Назва: /);
    expect(spellFormError({ ...base, stackable: true, maxStacks: 99 })).toMatch(/^Макс\. накопичень: /);
    expect(() => formToPayload({ ...base, targeting: { kind: "enemy", range: 1 } as never })).toThrow();
  });

  it("зіпсовані колонки рядка не ламають редактор", () => {
    const form = spellToForm({ ...row, targeting: { kind: "area" }, spellEffects: "oops", raceModifiers: null });

    expect(form).toMatchObject({ targeting: { kind: "enemy" }, spellEffects: [], raceModifiers: [] });
  });

  it("рівні 0–9 доступні для нового заклинання", () => {
    expect(formToPayload(spellToForm({ ...row, level: 0 })).level).toBe(0);
    expect(spellLevelOptions().map((o) => o.value)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });
});
it("keeps manual execution mode until DM explicitly configures mechanics", () => {
  expect(formToPayload(spellToForm({ ...row, executionMode: "manual" }))).toMatchObject({ executionMode: "manual" });
});
