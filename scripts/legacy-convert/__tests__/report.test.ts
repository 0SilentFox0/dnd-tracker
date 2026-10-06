import { describe, expect, it } from "vitest";

import { buildConversionReport } from "../report";

describe("buildConversionReport", () => {
  it("групує за статусами", () => {
    const md = buildConversionReport(
      [
        { kind: "skill", id: "1", name: "Ок", campaignId: "c", valid: true, result: { abilities: [], issues: [] } },
        { kind: "skill", id: "2", name: "Втрати", campaignId: "c", valid: true, result: { abilities: [], issues: [{ severity: "loss", message: "weird_stat: невідомий стат" }] } },
        { kind: "race", id: "3", name: "Зламано", campaignId: "c", valid: false, result: { abilities: [], issues: [] } },
      ],
      { date: "2026-10-08", mode: "dry-run" },
    );

    expect(md).toContain("Точно: 1");
    expect(md).toContain("З втратами: 1");
    expect(md).toContain("Не вдалося: 1");
    expect(md).toContain("| skill | Втрати | 2 | weird_stat: невідомий стат |");
  });
});
