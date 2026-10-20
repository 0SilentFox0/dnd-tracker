import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { loadStoryChapters } from "@/lib/server/scenario/player-story";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn() }, $queryRaw: vi.fn() } }));

const p = (text: string, secret = false) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, ...(secret && { marks: [{ type: "secret" }] }) }] }] });

const heroContent = {
  legend: [],
  sections: [
    { id: "h1", title: "Історія", played: false, revealedAt: "2026-10-20T00:00:00Z", rows: [{ id: "r1", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Відкрито " }, { type: "text", text: "СЕКРЕТ", marks: [{ type: "secret" }] }] }] }, notes: p("НОТАТКА") }] },
    { id: "h2", title: "Після собору", played: false, reveal: { mode: "afterSection", pageId: "scene1", sectionId: "s10" }, rows: [{ id: "r2", story: p("Друга"), notes: p("") }] },
    { id: "h3", title: "Закрита", played: false, reveal: { mode: "manual" }, rows: [{ id: "r3", story: p("Ні"), notes: p("") }] },
  ],
};

describe("loadStoryChapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("без hero-сторінок — [] і без зайвих запитів", async () => {
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([]);
    expect(await loadStoryChapters("ch", "camp")).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("відкриті глави без нотаток і секретів; зіграність читається лише як id", async () => {
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([{ id: "hero1", content: heroContent }] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "scene1", played: ["s10"] }] as never);

    const chapters = await loadStoryChapters("ch", "camp");

    expect(chapters.map((c) => c.id)).toEqual(["h1", "h2"]);

    const json = JSON.stringify(chapters);

    expect(json).not.toContain("СЕКРЕТ");
    expect(json).not.toContain("НОТАТКА");
    expect(json).toContain("Відкрито");
    expect(vi.mocked(prisma.scenarioPage.findMany).mock.calls[0][0]?.where).toEqual({ campaignId: "camp", characterId: "ch", kind: "hero" });
  });
});
