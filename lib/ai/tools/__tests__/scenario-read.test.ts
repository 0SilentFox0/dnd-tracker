import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/server/scenario/search", () => ({
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

    expect(out).toContain("## Собор [s1] (зіграно)");
    expect(out).toContain("### Рядок r1");
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
});
