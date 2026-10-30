import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { scenarioPage: { findMany: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/server/scenario/search", () => ({ pageIdsMatching: vi.fn(async () => ["p1"]), searchScenarioPages: vi.fn() }));

const ctx = { campaignId: "camp1", userId: "dm", scopes: ["ai"] as const, threadId: null, locale: "uk" as const };

const para = (t: string) => ({ type: "paragraph", content: [{ type: "text", text: t }] });

const rows = (n: number, lead: string) =>
  Array.from({ length: n }, (_, k) => ({
    id: `r${k}`,
    story: { type: "doc", content: [para(`${lead} №${k}: «Ізабель» сказала — "ходімо до собору"\nде дзвони б'ють, а ніч темна. `.repeat(6)), para("Ще один абзац з «лапками» і \"лапками\".")] },
    notes: { type: "doc", content: [para(`DC ${k}: Ізабель ховає ключ у склепі під вівтарем, ${"таємниця ".repeat(30)}`)] },
  }));

const page = (n: number) => ({ id: "p1", title: "Викрадення", kind: "scene", content: { legend: [], sections: [{ id: "s1", title: "Бал", played: false, rows: rows(n, "Сцена") }] } });

const run = async (tool: { handler: unknown }, input: unknown) => {
  const { runToolResult } = await import("@/lib/ai/tools/define");

  const out = await runToolResult(tool as never, ctx, input);

  if (out.kind !== "result") throw new Error("tool error");

  return out.data;
};

describe("scenario read tools through runToolResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue(page(70) as never);
    vi.mocked(prisma.scenarioPage.findMany).mockResolvedValue([page(150)] as never);
  });

  it("read_scenario_page keeps the trailer on every non-final chunk and paging rebuilds the page", async () => {
    const { readScenarioPageTool } = await import("@/lib/ai/tools/scenario-read");

    const { contentToMarkdown } = await import("@/lib/utils/scenario/read-chunks");

    const full = contentToMarkdown("Викрадення", page(70).content as never);

    expect(full.length).toBeGreaterThan(60_000);

    let offset: number | undefined;

    let rebuilt = "";

    let chunks = 0;

    for (;;) {
      const text = (await run(readScenarioPageTool, { pageId: "p1", offset })) as string;

      expect(typeof text).toBe("string");
      chunks++;

      const m = text.match(/\n\n\[next offset (\d+) of (\d+)\]$/);

      if (chunks === 1) expect(text.startsWith("# Викрадення")).toBe(true);

      if (!m) {
        rebuilt += offset === undefined ? text : `${text}`;
        break;
      }

      expect(Number(m[2])).toBe(full.length);
      rebuilt += text.slice(0, m.index);
      offset = Number(m[1]);
      rebuilt += "\n\n";
      expect(chunks).toBeLessThan(20);
    }

    expect(chunks).toBeGreaterThan(2);
    expect(rebuilt).toBe(full);
  });

  it("find_scenario_mentions returns visible hits within budget and pages through all of them", async () => {
    const { findScenarioMentionsTool } = await import("@/lib/ai/tools/scenario-read");

    type Out = { total: number; nextOffset: number | null; hits: { rowId: string; field: string }[] };

    const seen: string[] = [];

    let total = 0;

    let offset: number | undefined;

    let calls = 0;

    do {
      const out = (await run(findScenarioMentionsTool, { query: "Ізабель", offset })) as Out;

      expect(out.hits.length).toBeGreaterThan(0);
      expect(JSON.stringify(out).length).toBeLessThan(22_000);
      expect(out.total).toBeGreaterThanOrEqual(100);
      total = out.total;
      seen.push(...out.hits.map((h) => `${h.rowId}/${h.field}`));
      offset = out.nextOffset ?? undefined;
      calls++;
    } while (offset !== undefined && calls < 50);

    expect(calls).toBeGreaterThan(1);
    expect(seen.length).toBe(total);
    expect(seen[0]).toBe("r0/story");
  });
});
