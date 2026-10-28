import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/translate-error", () => ({ requestTranslator: vi.fn() }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { translateImportReport } from "@/lib/server/content/import/translate-report";
import type { ImportReport } from "@/types/content-import";

const getTranslator = async (locale: "en" | "uk") => (await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator")).getTranslator(locale);

const report = (issues: ImportReport["results"][number]["issues"]): ImportReport => ({
  dryRun: true,
  counts: { created: 0, updated: 0, skipped: 0, error: 1 },
  results: [{ row: 1, status: "error", issues }],
});

describe("translateImportReport", () => {
  it("перекладає ключі з параметрами і прибирає службові поля (en)", async () => {
    const t = await getTranslator("en");

    const out = translateImportReport(
      t,
      report([
        { level: "error", message: API_ERRORS.CLASS_NAME_TAKEN, params: { name: "Mage" } },
        { level: "error", message: "validation.min", minimum: 3, field: "name" },
        { level: "error", message: API_ERRORS.IMPORT_ROW_FAILED },
        { level: "warning", message: "Сирий український текст" },
      ]),
    );

    const messages = out.results[0].issues.map((i) => i.message);

    expect(messages[0]).toContain("Mage");
    expect(messages[1]).toContain("3");
    expect(messages[2]).toBe("Could not save the row");
    expect(messages[3]).toBe("Сирий український текст");
    expect(messages.every((m) => !/^(errors|validation)\./.test(m))).toBe(true);
    expect(JSON.stringify(out)).not.toMatch(/"params"|"minimum"|"maximum"/);
  });
});
