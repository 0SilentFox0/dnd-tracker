import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { pageIdsMatching } from "@/lib/server/scenario/search";
import { mentionPrefixes } from "@/lib/utils/scenario/mentions";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/server/scenario/search", () => ({
  pageIdsMatching: vi.fn(async () => ["p1"]),
  searchScenarioPages: vi.fn(async () => [{ pageId: "p1", pageTitle: "Монастир", sectionId: "s1", snippet: "…дзвони…" }]),
}));

const ctx = { campaignId: "camp1", userId: "dm", scopes: ["ai"] as const, threadId: null, locale: "uk" as const };

const content = {
  legend: [{ kind: "read", label: "Читати" }],
  sections: [
    {
      id: "s1",
      title: "Собор",
      played: true,
      rows: [
        {
          id: "r1",
          story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }, { type: "text", text: " таємниця", marks: [{ type: "secret" }] }] }] },
          notes: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "DC 12" }] }] },
        },
      ],
    },
  ],
};

describe("scenario read tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "Монастир", kind: "scene", content } as never);
  });

  it("read_scenario_page віддає markdown з id, нотатками і секретами", async () => {
    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const out = String(await readScenarioPageTool.handler(ctx, { pageId: "p1" }));

    expect(out).toContain("## Собор [s1] (played)");
    expect(out).toContain("### Row r1");
    expect(out).toContain("Дзвони|| таємниця||");
    expect(out).toContain("DC 12");
    expect(vi.mocked(prisma.scenarioPage.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "p1", campaignId: "camp1" } });
  });

  it("сторінка іншої кампанії — AiToolError", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(null);

    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const { AiToolError } = await import("@/lib/ai/tools/define");

    await expect(readScenarioPageTool.handler(ctx, { pageId: "x" })).rejects.toBeInstanceOf(AiToolError);
  });

  it("sectionId обмежує вивід одним розділом", async () => {
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({
      id: "p1",
      title: "М",
      kind: "scene",
      content: { ...content, sections: [...content.sections, { id: "s2", title: "Крипта", played: false, rows: [] }] },
    } as never);

    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const out = String(await readScenarioPageTool.handler(ctx, { pageId: "p1", sectionId: "s2" }));

    expect(out).toContain("Крипта");
    expect(out).not.toContain("Собор [s1]");
  });

  it("search_scenario", async () => {
    const { searchScenarioTool } = await import("@/lib/ai/tools/scenario-read");

    expect(await searchScenarioTool.handler(ctx, { query: "дзвони" })).toEqual([{ pageId: "p1", pageTitle: "Монастир", sectionId: "s1", snippet: "…дзвони…" }]);
  });

  it("read_scenario_page: offset і маркер [next offset]", async () => {
    const rows = Array.from({ length: 12 }, (_, k) => ({ id: `r${k}`, story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "а".repeat(4000) }] }] }, notes: { type: "doc", content: [] } }));

    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: [{ id: "s1", title: "С", played: false, rows }] } } as never);

    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const first = String(await readScenarioPageTool.handler(ctx, { pageId: "p1" }));

    expect(first.length).toBeLessThanOrEqual(23_000 + 60);

    const m = first.match(/\[next offset (\d+) of (\d+)\]$/);

    expect(m).not.toBeNull();

    if (!m) return;

    const second = String(await readScenarioPageTool.handler(ctx, { pageId: "p1", offset: Number(m[1]) }));

    expect(second.startsWith("### Row")).toBe(true);
  });

  it("outline_scenario_page і find_scenario_mentions", async () => {
    const { outlineScenarioPageTool, findScenarioMentionsTool } = await import("@/lib/ai/tools/scenario-read");

    expect(String(await outlineScenarioPageTool.handler(ctx, { pageId: "p1" }))).toContain("[s1]");

    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([{ id: "p1", title: "М", kind: "scene", content }] as never);

    const out = (await findScenarioMentionsTool.handler(ctx, { query: "дзвони" })) as { total: number; nextOffset: number | null; hits: { pageId: string; rowId: string }[] };

    expect(out.total).toBe(1);
    expect(out.nextOffset).toBeNull();
    expect(out.hits[0]).toMatchObject({ pageId: "p1", rowId: "r1" });
  });

  it("find_scenario_mentions without pageId reads only prefiltered pages, in prefilter order", async () => {
    const { findScenarioMentionsTool } = await import("@/lib/ai/tools/scenario-read");

    vi.mocked(pageIdsMatching).mockResolvedValueOnce(["p2", "p1"]);
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([
      { id: "p1", title: "A", kind: "scene", content },
      { id: "p2", title: "B", kind: "scene", content },
    ] as never);

    const out = (await findScenarioMentionsTool.handler(ctx, { query: "дзвони" })) as { hits: { pageId: string }[] };

    expect(pageIdsMatching).toHaveBeenCalledWith("camp1", mentionPrefixes("дзвони"));
    expect(vi.mocked(prisma.scenarioPage.findMany).mock.calls[0][0]).toMatchObject({ where: { id: { in: ["p2", "p1"] } } });
    expect(out.hits.map((h) => h.pageId)).toEqual(["p2", "p1"]);
  });

  it("find_scenario_mentions with no candidate pages skips findMany", async () => {
    const { findScenarioMentionsTool } = await import("@/lib/ai/tools/scenario-read");

    vi.mocked(pageIdsMatching).mockResolvedValueOnce([]);

    expect(await findScenarioMentionsTool.handler(ctx, { query: "дзвони" })).toEqual({ total: 0, offset: 0, nextOffset: null, forms: [], hits: [] });
    expect(prisma.scenarioPage.findMany).not.toHaveBeenCalled();
  });

  it("find_scenario_mentions with pageId uses loadPageForAi without the SQL prefilter", async () => {
    const { findScenarioMentionsTool } = await import("@/lib/ai/tools/scenario-read");

    const out = (await findScenarioMentionsTool.handler(ctx, { query: "дзвони", pageId: "p1" })) as { total: number };

    expect(out.total).toBe(1);
    expect(pageIdsMatching).not.toHaveBeenCalled();
    expect(prisma.scenarioPage.findMany).not.toHaveBeenCalled();
  });
});
