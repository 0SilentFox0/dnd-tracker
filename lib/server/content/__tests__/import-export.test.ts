import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));
vi.mock("@/lib/i18n/translator", async () => vi.importActual("@/lib/i18n/translator"));

import { getTranslator } from "@/lib/i18n/translator";
import { exampleCsv } from "@/lib/server/content/import/example";
import { exportCsv } from "@/lib/server/content/import/export";
import { buildOpenApi } from "@/lib/server/content/openapi";
import type { Actor } from "@/lib/utils/api/actor";
import { careerToImportRecord } from "@/lib/utils/careers/import-record";
import { autoMap, IMPORT_SPECS, parseTable, transformRow } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const NAMES: Partial<Record<ImportKind, IdName[]>> = {
  races: [{ id: "r1", name: "Гноми" }, { id: "r2", name: "Ельфи" }],
  feats: [{ id: "f1", name: "Lettered" }],
  spells: [{ id: "s1", name: "Вогонь, сильний" }, { id: "s2", name: "Лід" }],
};

const loadNames = async (_c: string, kind: ImportKind) => NAMES[kind] ?? [];

const readBack = (csv: string, kind: ImportKind) => {
  const table = parseTable(csv);

  const mapping = autoMap(table.headers, IMPORT_SPECS[kind].fields);

  return { table, mapping, rows: table.rows.map((row) => transformRow(row, mapping, IMPORT_SPECS[kind].fields)) };
};

const t = await getTranslator("uk");

describe("exampleCsv", () => {
  it("заголовки — підписи полів, посилання — назва першого запису кампанії; читається без помилок", async () => {
    const csv = await exampleCsv(actor, "units", { loadNames, locale: "uk" });

    const { table, mapping, rows } = readBack(csv, "units");

    expect(table.headers).toEqual(IMPORT_SPECS.units.fields.map((f) => t(f.labelKey)));
    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows.map((r) => r.value.raceId)).toEqual(["Гноми", "Гноми"]);
    expect(rows.map((r) => r.value.name)).toEqual(["Гоблін-лучник", "Вовк"]);
    expect(rows.flatMap((r) => r.issues)).toEqual([]);
  });

  it("англійський шаблон: заголовки й приклади англійською, читається без помилок", async () => {
    const csv = await exampleCsv(actor, "units", { loadNames, locale: "en" });

    const { table, mapping, rows } = readBack(csv, "units");

    expect(table.headers[0]).toBe("Name");
    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows.map((r) => r.value.name)).toEqual(["Goblin Archer", "Wolf"]);
    expect(rows.flatMap((r) => r.issues)).toEqual([]);
  });

  it("wfrp-шаблони: units/artifacts/careers мають WFRP-колонки й читаються без помилок", async () => {
    const tEn = await getTranslator("en");

    const units = readBack(await exampleCsv(actor, "units", { loadNames, locale: "en" }), "units");

    const characteristics = IMPORT_SPECS.units.fields.find((f) => f.key === "characteristics");

    expect(units.table.headers).toContain(tEn(characteristics!.labelKey));
    expect(units.rows.flatMap((r) => r.issues)).toEqual([]);

    const artifacts = readBack(await exampleCsv(actor, "artifacts", { loadNames, locale: "en" }), "artifacts");

    expect(IMPORT_SPECS.artifacts.fields.map((f) => f.key)).toContain("systemStats");
    expect(artifacts.table.headers).toContain(tEn(IMPORT_SPECS.artifacts.fields.find((f) => f.key === "systemStats")!.labelKey));
    expect(artifacts.rows.flatMap((r) => r.issues)).toEqual([]);

    const careers = readBack(await exampleCsv(actor, "careers", { loadNames, locale: "en" }), "careers");

    for (const n of [1, 2, 3, 4]) expect(careers.table.headers).toEqual(expect.arrayContaining([tEn(`contentImport.fields.careers.tier${n}_name`)]));

    expect(careers.rows.flatMap((r) => r.issues)).toEqual([]);
  });

  it("гравець — 403", async () => {
    await expect(exampleCsv({ ...actor, isDM: false }, "units", { loadNames, locale: "uk" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("exportCsv", () => {
  it("експорт → імпорт дає ті самі значення (кома в назві, CR-дріб, здібності, атаки)", async () => {
    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Лють" }] }];

    const attacks = [{ name: "Укус", attackBonus: 4, damageType: "piercing", damageDice: "1d6" }];

    const record = { id: "u1", campaignId: "c1", name: "Вогняний, лютий", level: 3, raceId: "r1", knownSpells: ["s1", "s2"], cr: 0.25, xp: null, avatar: null, abilities, attacks, saveProficiencies: ["dexterity"] };

    const csv = await exportCsv(actor, "units", { loadRecords: async () => [record], loadNames, locale: "uk" });

    const { mapping, rows } = readBack(csv, "units");

    expect(Object.values(mapping).every(Boolean)).toBe(true);
    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value).toEqual({ name: "Вогняний, лютий", level: 3, raceId: "Гноми", knownSpells: ["Вогонь, сильний", "Лід"], cr: 0.25, abilities, attacks, saveProficiencies: ["dexterity"] });
  });

  it("заклинання: кістки й грань окремими колонками повертаються числами", async () => {
    const csv = await exportCsv(actor, "spells", { loadRecords: async () => [{ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } }], loadNames, locale: "uk" });

    expect(readBack(csv, "spells").rows[0].value).toEqual({ name: "Куля", level: 3, dice: 8, dieSides: 6, cost: "action", concentration: false, targeting: { kind: "enemy" } });
  });

  it("артефакт: параметри касту предмета зберігаються в JSON колонці", async () => {
    const item = { charges: { max: 5, rest: "long" }, spells: [{ spellId: "s1", cost: 1, castLevel: 1, upcast: { maxLevel: 3, extraCost: 1 } }] };

    const csv = await exportCsv(actor, "artifacts", { loadRecords: async () => [{ id: "wand", name: "Жезл", slot: "item", item }], loadNames, locale: "uk" });

    const { rows } = readBack(csv, "artifacts");

    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value.item).toEqual({ ...item, spells: [{ ...item.spells[0], spellId: "Вогонь, сильний" }] });
  });

  it("кар'єра: рівні, таланти за назвою й спорядження повертаються як у записі", async () => {
    const record = { id: "c1", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", status: "Brass 3", characteristics: ["int"], skills: ["research"], talents: ["f1"], trappings: ["Quill and ink", "Candle stub"] }] };

    const importRecord = careerToImportRecord(record as unknown as Career);

    const csv = await exportCsv(actor, "careers", { loadRecords: async () => [importRecord], loadNames, locale: "en" });

    const { rows } = readBack(csv, "careers");

    const { id: _id, ...expected } = importRecord;

    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value).toEqual({ ...expected, tier1_talents: ["Lettered"] });
  });

  it("артефакт: systemStats зброї (Light Crossbow) зберігається в JSON колонці", async () => {
    const systemStats = { type: "weapon", group: "crossbow", range: 180, damage: { addSb: false, flat: 7 }, qualities: [], flaws: [{ key: "reload", value: 1 }], twoHanded: true, ammoCapacity: 1, weight: 2, price: 600 };

    const csv = await exportCsv(actor, "artifacts", { loadRecords: async () => [{ id: "lc", name: "Light Crossbow", slot: "range_weapon", systemStats }], loadNames, locale: "en" });

    const { rows } = readBack(csv, "artifacts");

    expect(rows[0].issues).toEqual([]);
    expect(rows[0].value.systemStats).toEqual(systemStats);
  });

  it("раси: колонки profile немає (профіль редагується лише в UI виду)", () => {
    expect(IMPORT_SPECS.races.fields.map((f) => f.key)).not.toContain("profile");
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
    expect(doc.components.responses.CsvOk).toEqual({ description: "Success", content: { "text/csv": { schema: { type: "string" } } } });
  });
});
