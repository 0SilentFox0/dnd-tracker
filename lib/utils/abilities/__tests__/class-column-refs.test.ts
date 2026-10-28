import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createClassSchema } from "@/lib/schemas/classes";
import { abilityColumnRefs, CLASS_REF_OUTSIDE, columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { validateAbilities } from "@/lib/utils/abilities/editor";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ClassColumn } from "@/types/classes";

const values = Array.from({ length: 20 }, () => "2");

const columns: ClassColumn[] = [
  { key: "rages", label: "Rages", values },
  { key: "focus-points", label: "Focus Points", values, pool: { rest: "short" } },
];

const rage: Ability = {
  id: "rage",
  name: "Rage",
  trigger: { event: "bonusAction" },
  limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
  effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } }],
};

const patient: Ability = { id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "rages", cost: 1 } }, effects: [{ kind: "note", text: "x" }] };

describe("column refs", () => {
  it("finds scale refs in effects and uses, and the pool", () => {
    expect(abilityColumnRefs(rage)).toEqual([
      { path: ["effects", 0, "flat"], key: "rage-damage", kind: "scale" },
      { path: ["limits", "perRest", "uses"], key: "rages", kind: "scale" },
    ]);
    expect(abilityColumnRefs(patient)).toEqual([{ path: ["limits", "pool", "key"], key: "rages", kind: "pool" }]);
  });

  it("issues: outside a class, unknown key, pool on a plain column", () => {
    expect(columnRefIssues([rage], null)).toEqual([
      { path: [0, "effects", 0, "flat"], message: CLASS_REF_OUTSIDE },
      { path: [0, "limits", "perRest", "uses"], message: CLASS_REF_OUTSIDE },
    ]);
    expect(columnRefIssues([rage], columns)).toEqual([{ path: [0, "effects", 0, "flat"], message: "Немає колонки «rage-damage» у таблиці класу" }]);
    expect(columnRefIssues([patient], columns)).toEqual([{ path: [0, "limits", "pool", "key"], message: "Колонка «Rages» не є пулом" }]);
  });

  it("validateAbilities: issues without classColumns, none with matching columns", () => {
    const fixed = { ...rage, effects: [{ kind: "damageBonus" as const, filter: { kind: "melee" as const }, flat: { scale: "rages" }, duration: { rounds: 10 } }] };

    expect(validateAbilities([fixed])).toEqual({ ok: false, errorsByPath: { "0.effects.0.flat": [CLASS_REF_OUTSIDE], "0.limits.perRest.uses": [CLASS_REF_OUTSIDE] } });
    expect(validateAbilities([fixed], { classColumns: columns })).toEqual({ ok: true, errorsByPath: {} });
    expect(validateAbilities([{ id: "x", name: "X", trigger: { event: "passive" }, effects: [{ kind: "note", text: "n" }] }])).toEqual({ ok: true, errorsByPath: {} });
  });

  it("class schema rejects refs to missing columns in features and subclasses", () => {
    const bad = createClassSchema.safeParse({ name: "Barbarian", columns, features: [{ level: 1, abilities: [rage] }] });

    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path)).toEqual([["features", 0, "abilities", 0, "effects", 0, "flat"]]);

    const sub = createClassSchema.safeParse({ name: "Monk", columns, subclasses: [{ id: "oh", name: "Open Hand", features: [{ level: 3, abilities: [patient] }] }] });

    expect(sub.error?.issues.map((i) => i.path)).toEqual([["subclasses", 0, "features", 0, "abilities", 0, "limits", "pool", "key"]]);
    expect(API_ERRORS.CLASS_COLUMN_UNKNOWN).toBeTruthy();
  });
});
