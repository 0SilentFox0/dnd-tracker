import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitSchema } from "@/lib/schemas/units";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { UNITS_IMPORT } from "@/lib/utils/content/import/fields/units";
import { autoMap, transformRow } from "@/lib/utils/content/import/mapping";
import { parseTable } from "@/lib/utils/content/import/table";
import { resolveImportRaces, toUnitCreateData } from "@/lib/utils/units/import-units";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import { convertCSVRowToUnit } from "@/lib/utils/units/unit-parsing";
import type { CSVUnitRow } from "@/types/import";

const csv = fs.readFileSync(path.join(process.cwd(), "docs/units/units-all.csv"), "utf8");

const races = ["Демони", "Гноми", "Ельфи", "Нежить", "Академія"].map((name, i) => ({ id: `r${i}`, name }));

// columns createMany left to DB defaults in the old import
const LEGACY_DEFAULTS = { immunities: [], morale: 0, minTargets: 1, maxTargets: 1 };

const normalize = (data: Record<string, unknown>) => ({ ...data, abilities: data.abilities === undefined ? [] : AbilitiesSchema.parse(data.abilities) });

describe("units: старі заголовки CSV", () => {
  it.each([
    ["Tier", "level"], ["tier", "level"], ["Назва", "name"], ["name", "name"], ["Name", "name"],
    ["КД", "armorClass"], ["ac", "armorClass"], ["AC", "armorClass"], ["ХП", "maxHp"], ["hp", "maxHp"], ["HP", "maxHp"],
    ["Швидкість", "speed"], ["speed", "speed"], ["Speed", "speed"], ["СИЛ", "strength"], ["str", "strength"], ["STR", "strength"],
    ["ЛОВ", "dexterity"], ["dex", "dexterity"], ["DEX", "dexterity"], ["ТІЛ", "constitution"], ["con", "constitution"], ["CON", "constitution"],
    ["ІНТ", "intelligence"], ["int", "intelligence"], ["INT", "intelligence"], ["МДР", "wisdom"], ["wis", "wisdom"], ["WIS", "wisdom"],
    ["ХАР", "charisma"], ["cha", "charisma"], ["CHA", "charisma"], ["Навички/Здібності", "abilities"], ["abilities", "abilities"], ["Abilities", "abilities"],
    ["Атаки", "attacks"], ["attacks", "attacks"], ["Attacks", "attacks"], ["Особливості", "abilities"], ["features", "abilities"], ["Features", "abilities"],
    ["Група", "raceId"], ["group", "raceId"], ["Group", "raceId"], ["Initiative", "initiative"], ["initiative", "initiative"],
    ["Image", "avatar"], ["image", "avatar"], ["URL", "avatar"],
  ])("%s → %s", (header, key) => expect(autoMap([header], UNITS_IMPORT.fields)[header]).toBe(key));

  it("«Спасброски» не зіставляється (старий імпорт її ігнорував)", () => expect(autoMap(["Спасброски"], UNITS_IMPORT.fields)).toEqual({ Спасброски: null }));
});

describe("units: units-all.csv новим шляхом", () => {
  const table = parseTable(csv, "units-all.csv");

  const mapping = autoMap(table.headers, UNITS_IMPORT.fields);

  it("кожен рядок дає ті самі дані юніта, що й старий імпорт", () => {
    const { raceIdOf } = resolveImportRaces([], races);

    const raceIdByName = new Map(races.map((r) => [r.name, r.id]));

    expect(table.rows).toHaveLength(104);

    for (const row of table.rows) {
      const legacyUnit = importUnitSchema.parse(convertCSVRowToUnit(row as CSVUnitRow));

      const legacy = toUnitCreateData("c1", legacyUnit, raceIdOf(legacyUnit.raceName));

      const { value, issues } = transformRow(row, mapping, UNITS_IMPORT.fields);

      expect(issues.filter((i) => i.level === "error")).toEqual([]);

      const body = UNITS_IMPORT.toBody ? UNITS_IMPORT.toBody(value, "create") : value;

      const withRace = { ...body, raceId: typeof body.raceId === "string" ? raceIdByName.get(body.raceId) : undefined };

      const next = unitCreateData("c1", createUnitSchema.parse(withRace));

      expect(normalize(next as Record<string, unknown>), String(row["Назва"])).toEqual(normalize({ ...LEGACY_DEFAULTS, ...(legacy as Record<string, unknown>) }));
    }
  });
});

describe("units: toBody", () => {
  it("create без майстерності й CR — майстерність за рівнем; з CR або в update — без змін", () => {
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9 }, "create")).toEqual({ name: "А", level: 9, proficiencyBonus: 4 });
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9, cr: 2 }, "create")).toEqual({ name: "А", level: 9, cr: 2 });
    expect(UNITS_IMPORT.toBody?.({ name: "А", level: 9 }, "update")).toEqual({ name: "А", level: 9 });
  });
});
