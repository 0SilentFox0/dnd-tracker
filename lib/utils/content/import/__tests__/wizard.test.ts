// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { aiSample, loadStoredMapping, mergeReports, readImportFile, reportToCsv, saveStoredMapping, statusLabel } from "../wizard";

import { IMPORT_SPECS, parseTable } from "@/lib/utils/content/import";
import type { ImportReport, ParsedTable } from "@/types/content-import";

const report = (results: ImportReport["results"], dryRun = false): ImportReport => ({
  dryRun,
  results,
  counts: { created: results.filter((r) => r.status === "created").length, updated: 0, skipped: 0, error: results.filter((r) => r.status === "error").length },
});

const TABLE: ParsedTable = { format: "csv", headers: ["Назва", "ХП"], rows: [{ Назва: "Біс", ХП: "18" }, { Назва: "Вовк", ХП: "багато" }] };

describe("wizard utils", () => {
  beforeEach(() => window.localStorage.clear());

  it("readImportFile: XLSX — підказка зберегти як CSV; інші розширення — відмова; CSV читається", async () => {
    await expect(readImportFile(new File(["x"], "a.xlsx"))).rejects.toThrow("CSV (UTF-8)");
    await expect(readImportFile(new File(["x"], "a.pdf"))).rejects.toThrow("CSV, TSV і JSON");
    expect(await readImportFile(new File(["Назва\nА"], "a.CSV"))).toBe("Назва\nА");
  });

  it("mergeReports зсуває номери рядків частин і сумує лічильники", () => {
    const merged = mergeReports([
      { offset: 0, report: report([{ row: 1, status: "created", issues: [] }]) },
      { offset: 100, report: report([{ row: 1, status: "error", issues: [{ level: "error", message: "x" }] }]) },
    ], false);

    expect(merged.results.map((r) => r.row)).toEqual([1, 101]);
    expect(merged.counts).toEqual({ created: 1, updated: 0, skipped: 0, error: 1 });
  });

  it("reportToCsv: лише рядки з помилками з вихідними клітинками", () => {
    const csv = reportToCsv(TABLE, report([{ row: 1, status: "created", issues: [] }, { row: 2, status: "error", issues: [{ field: "maxHp", level: "error", message: "ХП: Очікується ціле число" }] }]));

    expect(parseTable(csv).rows).toEqual([{ Назва: "Вовк", ХП: "багато", Статус: "Помилка", Помилки: "ХП: Очікується ціле число" }]);
  });

  it("aiSample: до 5 рядків, клітинки до 200 символів, не-рядки — JSON", () => {
    const table: ParsedTable = { format: "json", headers: ["a", "b"], rows: Array.from({ length: 7 }, () => ({ a: "x".repeat(300), b: { k: 1 } })) };

    const sample = aiSample(table);

    expect(sample).toHaveLength(5);
    expect(sample[0].a).toHaveLength(200);
    expect(sample[0].b).toBe('{"k":1}');
  });

  it("мапінг зберігається за набором заголовків; невідомі ключі полів відкидаються", () => {
    saveStoredMapping("units", ["Назва", "Хто"], { Назва: "name", Хто: "raceId" });
    window.localStorage.setItem("junk", "1");

    expect(loadStoredMapping("units", ["Назва", "Хто"], IMPORT_SPECS.units.fields)).toEqual({ Назва: "name", Хто: "raceId" });
    expect(loadStoredMapping("units", ["Назва"], IMPORT_SPECS.units.fields)).toEqual({});
    expect(loadStoredMapping("spells", ["Назва", "Хто"], IMPORT_SPECS.spells.fields)).toEqual({});

    saveStoredMapping("units", ["A"], { A: "nope" });

    expect(loadStoredMapping("units", ["A"], IMPORT_SPECS.units.fields)).toEqual({ A: null });
  });

  it("statusLabel", () => {
    expect(statusLabel("created", true)).toBe("Буде створено");
    expect(statusLabel("updated", false)).toBe("Оновлено");
  });
});
