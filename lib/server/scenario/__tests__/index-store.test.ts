import { describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: { scenarioPageSummary: { findMany } } }));
vi.mock("server-only", () => ({}));

import { loadSummaryRelations } from "@/lib/server/scenario/index-store";

describe("loadSummaryRelations", () => {
  it("returns relations of present pages, skipping missing, legacy and invalid summaries", async () => {
    findMany.mockResolvedValueOnce([
      { pageId: "p1", summary: { relations: [{ a: "unit:1", b: "unit:2", label: "allies" }] } },
      { pageId: "p2", summary: { overview: "legacy" } },
      { pageId: "p3", summary: { relations: [{ a: "unit:1", b: "unit:2", label: "x".repeat(500) }] } },
      { pageId: "gone", summary: { relations: [{ a: "unit:1", b: "unit:2", label: "late" }] } },
    ]);

    expect(await loadSummaryRelations("camp", new Set(["p1", "p2", "p3"]))).toEqual([{ sceneId: "p1", a: "unit:1", b: "unit:2", label: "allies" }]);
  });
});
