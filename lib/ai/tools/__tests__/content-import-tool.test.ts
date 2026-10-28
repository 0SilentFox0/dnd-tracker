import { beforeEach, describe, expect, it, vi } from "vitest";

const importContent = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/content/import/import-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/content/import/import-content")>()),
  importContent,
}));

import { toolsFor } from "@/lib/ai/tools";
import { contentImportTool } from "@/lib/ai/tools/content";
import { runTool } from "@/lib/ai/tools/define";

const ctx = { campaignId: "c1", userId: "u1", scopes: ["content:write"] as const, threadId: null };

describe("content_import", () => {
  beforeEach(() => vi.clearAllMocks());

  it("кличе importContent від імені токена з defaults і повертає стислий звіт", async () => {
    importContent.mockResolvedValue({
      dryRun: true,
      counts: { created: 1, updated: 0, skipped: 0, error: 60 },
      results: [{ row: 1, status: "created", issues: [] }, ...Array.from({ length: 60 }, (_, i) => ({ row: i + 2, status: "error", issues: [{ level: "error", message: "x" }] }))],
    });

    const text = await runTool(contentImportTool, ctx, { kind: "units", rows: [{ name: "А" }], dryRun: true });

    expect(importContent).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c1", userId: "u1", isDM: true, via: "token" }), "units", { rows: [{ name: "А" }], mode: "create", dryRun: true });

    const out = JSON.parse(text);

    expect(out.rows).toHaveLength(50);
    expect(out.rows[0].row).toBe(2);
    expect(out.omitted).toBe(10);
    expect(out.counts.error).toBe(60);
  });

  it("вид поза імпортом і 501 рядок — помилка параметрів без виклику", async () => {
    expect(await runTool(contentImportTool, ctx, { kind: "tracks", rows: [{ name: "А" }] })).toContain("некоректні параметри");
    expect(await runTool(contentImportTool, ctx, { kind: "units", rows: Array.from({ length: 501 }, () => ({})) })).toContain("некоректні параметри");
    expect(importContent).not.toHaveBeenCalled();
  });

  it("доступний лише з content:write", () => {
    expect(toolsFor(["content:read"]).map((t) => t.name)).not.toContain("content_import");
    expect(toolsFor(["content:write"]).map((t) => t.name)).toContain("content_import");
  });
});
