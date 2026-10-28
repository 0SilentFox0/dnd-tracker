import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import { createArtifactSchema, createArtifactSetSchema, createClassSchema, createFeatSchema, createMainSkillSchema, createRaceSchema, createSkillSchema, createSpellGroupSchema, createSpellSchema, createUnitSchema } from "@/lib/schemas";
import { autoMap, IMPORT_KINDS, IMPORT_SPECS, normalizeHeader, transformRow } from "@/lib/utils/content/import";
import type { ImportKind } from "@/types/content-import";

const CREATE: Record<ImportKind, ZodType> = {
  units: createUnitSchema,
  spells: createSpellSchema,
  skills: createSkillSchema,
  "main-skills": createMainSkillSchema,
  "spell-groups": createSpellGroupSchema,
  races: createRaceSchema,
  classes: createClassSchema,
  feats: createFeatSchema,
  artifacts: createArtifactSchema,
  "artifact-sets": createArtifactSetSchema,
};

const exampleRow = (kind: ImportKind, i: 0 | 1) => Object.fromEntries(IMPORT_SPECS[kind].fields.map((f) => [f.label, f.examples[i]]));

describe("IMPORT_SPECS", () => {
  it("є специфікація для кожного виду імпорту", () => expect(Object.keys(IMPORT_SPECS).sort()).toEqual([...IMPORT_KINDS].sort()));

  it.each(IMPORT_KINDS)("%s: одне обов'язкове поле name", (kind) => {
    const { fields } = IMPORT_SPECS[kind];

    expect(fields.filter((f) => f.key === "name")).toHaveLength(1);
    expect(fields.find((f) => f.key === "name")?.required).toBe(true);
  });

  it.each(IMPORT_KINDS)("%s: ключ, підпис і синоніми не перетинаються між полями", (kind) => {
    const owner = new Map<string, string>();

    for (const f of IMPORT_SPECS[kind].fields) {
      for (const alias of [f.key, f.label, ...f.aliases]) {
        const k = normalizeHeader(alias);

        expect(owner.get(k) ?? f.key, `${kind}: «${alias}»`).toBe(f.key);
        owner.set(k, f.key);
      }
    }
  });

  it.each(IMPORT_KINDS)("%s: посилання ведуть на відомі види", (kind) => {
    for (const f of IMPORT_SPECS[kind].fields) if (f.type === "ref" || f.type === "refList") expect(IMPORT_KINDS).toContain(f.ref);
  });

  it.each(IMPORT_KINDS)("%s: обидва рядки прикладу проходять схему створення", (kind) => {
    const spec = IMPORT_SPECS[kind];

    for (const i of [0, 1] as const) {
      const row = exampleRow(kind, i);

      const { value, issues } = transformRow(row, autoMap(Object.keys(row), spec.fields), spec.fields);

      expect(issues).toEqual([]);

      const parsed = CREATE[kind].safeParse(spec.toBody ? spec.toBody(value, "create") : value);

      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it("skills: create вкладає групи завжди, update — лише надані", () => {
    expect(IMPORT_SPECS.skills.toBody?.({ name: "А" }, "create")).toEqual({ basicInfo: { name: "А" }, spellData: {}, mainSkillData: {} });
    expect(IMPORT_SPECS.skills.toBody?.({ name: "А", mainSkillId: "m1", abilities: [] }, "update")).toEqual({ abilities: [], basicInfo: { name: "А" }, mainSkillData: { mainSkillId: "m1" } });
  });

  it("spells: «8d6» → 8 кісток і грань 6; явна грань лишається; число — як є", () => {
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: "8d6" }, "create")).toEqual({ name: "А", dice: 8, dieSides: 6 });
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: "2d8", dieSides: 10 }, "create")).toEqual({ name: "А", dice: 2, dieSides: 10 });
    expect(IMPORT_SPECS.spells.toBody?.({ name: "А", dice: 3 }, "create")).toEqual({ name: "А", dice: 3 });
  });

  it("enum-підписи: слот артефакта, роль, тип заклинача, характеристики класу", () => {
    const row = { Назва: "Меч", Слот: "зброя" };

    expect(transformRow(row, autoMap(Object.keys(row), IMPORT_SPECS.artifacts.fields), IMPORT_SPECS.artifacts.fields).value).toEqual({ name: "Меч", slot: "weapon" });

    const cls = { Назва: "Жрець", "Тип заклинача": "Повний заклинач", "Рятівні кидки": "Мудрість, ХАР" };

    expect(transformRow(cls, autoMap(Object.keys(cls), IMPORT_SPECS.classes.fields), IMPORT_SPECS.classes.fields).value).toEqual({ name: "Жрець", caster: "full", savingThrows: ["wisdom", "charisma"] });
  });
});
