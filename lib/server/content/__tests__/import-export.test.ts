import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { exampleCsv } from "@/lib/server/content/import/example";
import { exportCsv } from "@/lib/server/content/import/export";
import { buildOpenApi } from "@/lib/server/content/openapi";
import type { Actor } from "@/lib/utils/api/actor";
import { autoMap, IMPORT_SPECS, parseTable, transformRow } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const NAMES: Partial<Record<ImportKind, IdName[]>> = {
  races: [{ id: "r1", name: "Гноми" }, { id: "r2", name: "Ельфи" }],
  spells: [{ id: "s1", name: "Вогонь, сильний" }, { id: "s2", name: "Лід" }],
};

const loadNames = async (_c: string, kind: ImportKind) => NAMES[kind] ?? [];

const readBack = (csv: string, kind: ImportKind) => {
  const table = parseTable(csv);

  const mapping = autoMap(table.headers, IMPORT_SPECS[kind].fields);

  return { table, mapping, rows: table.rows.map((row) => transformRow(row, mapping, IMPORT_SPECS[kind].fields)) };
};

describe("exampleCsv", () => {
  it("заголовки — підписи полів, посилання — назва першого запису кампанії; читається без помилок", async () => {
    const csv = await exampleCsv(actor, "units", { loadNames });

    const { table, mapping, rows } = readBack(csv, "units");

    expect(table.headers).toEqual(IMPORT_SPECS.units.fields.map((f) => f.label));
    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows.map((r) => r.value.raceId)).toEqual(["Гноми", "Гноми"]);
    expect(rows.map((r) => r.value.name)).toEqual(["Гоблін-лучник", "Вовк"]);
    expect(rows.flatMap((r) => r.issues)).toEqual([]);
  });

  it("гравець — 403", async () => {
    await expect(exampleCsv({ ...actor, isDM: false }, "units", { loadNames })).rejects.toMatchObject({ status: 403 });
  });
});

describe("exportCsv", () => {
  it("експорт → імпорт дає ті самі значення (кома в назві, CR-дріб, здібності, атаки)", async () => {
    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Лють" }] }];

    const attacks = [{ name: "Укус", attackBonus: 4, damageType: "piercing", damageDice: "1d6" }];

    const record = { id: "u1", campaignId: "c1", name: "Вогняний, лютий", level: 3, raceId: "r1", knownSpells: ["s1", "s2"], cr: 0.25, xp: null, avatar: null, abilities, attacks, saveProficiencies: ["dexterity"] };

    const csv = await exportCsv(actor, "units", { loadRecords: async () => [record], loadNames });

    const { mapping, rows } = readBack(csv, "units");

    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value).toEqual({ name: "Вогняний, лютий", level: 3, raceId: "Гноми", knownSpells: ["Вогонь, сильний", "Лід"], cr: 0.25, abilities, attacks, saveProficiencies: ["dexterity"] });
  });

  it("заклинання: кістки й грань окремими колонками повертаються числами", async () => {
    const csv = await exportCsv(actor, "spells", { loadRecords: async () => [{ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } }], loadNames });

    expect(readBack(csv, "spells").rows[0].value).toEqual({ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } });
  });

  it("токен без content:read — 403", async () => {
    await expect(exportCsv({ ...actor, via: "token", scopes: ["ai"] }, "units", { loadRecords: async () => [], loadNames })).rejects.toMatchObject({ status: 403 });
  });
});

describe("OpenAPI", () => {
  const doc = buildOpenApi();

  const op = (id: string) => Object.values(doc.paths).flatMap((methods) => Object.values(methods)).find((o) => o.operationId === id);

  it("content.import має тіло; приклад і експорт віддають text/csv з правом content:read", () => {
    expect(op("content.import")?.requestBody).toBeDefined();
    expect(op("content.export")?.responses["200"]).toEqual({ $ref: "#/components/responses/CsvOk" });
    expect(op("content.import-example")?.["x-scopes"]).toEqual(["content:read"]);
    expect(doc.components.responses.CsvOk).toEqual({ description: "Успіх", content: { "text/csv": { schema: { type: "string" } } } });
  });
});
