import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

const executeRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw, $executeRaw: executeRaw } }));
vi.mock("server-only", () => ({}));

import { loadDigestItems, refreshSummaryFreshness } from "@/lib/server/scenario/summary-store";
import { summaryInputHash } from "@/lib/utils/scenario/summary/hash";
import type { ScenarioContent } from "@/types/scenario";

describe("loadDigestItems", () => {
  beforeEach(() => queryRaw.mockReset());

  const sql = () => (queryRaw.mock.calls[0][0] as string[]).join("?");

  const row = (over: Record<string, unknown> = {}) => ({ id: "a", title: "A", arc: null, sortOrder: 1, facts: null, digest: null, stale: null, leads: [], ...over });

  const facts = { sections: [
    { id: "s1", title: "Intro", played: true, refs: [{ type: "unit", id: "u1", label: "Wolf", count: 2, secret: false }, { type: "unit", id: "u2", label: "", count: 9, secret: false }] },
    { id: "s2", title: "Fight", played: false, refs: [{ type: "unit", id: "u1", label: "Wolf", count: 1, secret: false }, { type: "character", id: "c1", label: "Zehir", count: 4, secret: false }] },
  ] };

  it("builds sections, leads and ranked entities from facts and searchText leads", async () => {
    queryRaw.mockResolvedValue([row({ facts, leads: ["s1\tIntro The wolves howl", "s2\tFight"] })]);

    expect(await loadDigestItems("camp")).toEqual([
      { id: "a", title: "A", arc: null, sortOrder: 1, llm: null, sections: [{ title: "Intro", played: true, lead: "The wolves howl" }, { title: "Fight", played: false, lead: "" }], entities: ["Zehir", "Wolf"] },
    ]);
  });

  it("without a current index falls back to searchText sections and no entities", async () => {
    queryRaw.mockResolvedValue([row({ leads: ["s1\tIntro The wolves howl"] })]);

    const [page] = await loadDigestItems("camp");

    expect(page.entities).toEqual([]);
    expect(page.sections).toEqual([{ title: "Intro The wolves howl", played: false, lead: "" }]);
  });

  it("ignores invalid facts", async () => {
    queryRaw.mockResolvedValue([row({ facts: { sections: "nope" }, leads: [] })]);

    expect(await loadDigestItems("camp")).toMatchObject([{ sections: [], entities: [] }]);
  });

  it("keeps pages without summaries and maps llm digest with stale; blank digest is ignored", async () => {
    queryRaw.mockResolvedValue([row({ digest: "d", stale: true }), row({ id: "b", digest: "  ", stale: false }), row({ id: "c" })]);

    const pages = await loadDigestItems("camp");

    expect(pages.map((p) => p.llm)).toEqual([{ digest: "d", stale: true }, null, null]);
  });

  it("limits entities to digestEntities", async () => {
    const many = { sections: [{ id: "s", title: "T", played: false, refs: Array.from({ length: 20 }, (_, i) => ({ type: "unit", id: `u${i}`, label: `E${i}`, count: 1, secret: false })) }] };

    queryRaw.mockResolvedValue([row({ facts: many })]);

    expect((await loadDigestItems("camp"))[0].entities).toHaveLength(12);
  });

  it("uses LEFT JOINs, a version-gated index and orders deterministically", async () => {
    queryRaw.mockResolvedValue([]);

    await loadDigestItems("camp");

    expect(sql()).toContain("LEFT JOIN scenario_page_index");
    expect(sql()).toContain("LEFT JOIN scenario_page_summaries");
    expect(sql()).toContain("i.version = p.version");
    expect(sql()).toContain('ORDER BY p."sortOrder", p.title, p.id');
  });

  it("never selects page content or the whole searchText", async () => {
    queryRaw.mockResolvedValue([]);

    await loadDigestItems("camp");

    expect(sql()).not.toMatch(/p\.content|p\.\*|SELECT\s+\*/i);
    expect(sql()).not.toMatch(/SELECT[^()]*p\."searchText"\s*[,\n]/);
  });
});

describe("refreshSummaryFreshness", () => {
  const page = { title: "A", kind: "scene", arc: null, content: { legend: [], sections: [] } as unknown as ScenarioContent };

  beforeEach(() => {
    executeRaw.mockReset();
  });

  it("updates guarded by hash and a lower version", async () => {
    executeRaw.mockResolvedValue(1);

    await refreshSummaryFreshness("p1", 4, page);

    const [strings, ...values] = executeRaw.mock.calls[0] as [string[], ...unknown[]];

    expect(strings.join("?")).toContain('"inputHash" = ?');
    expect(strings.join("?")).toContain("version < ?");
    expect(values).toEqual([4, "p1", summaryInputHash(page), 4]);
  });

  it("swallows database errors", async () => {
    executeRaw.mockRejectedValue(new Error("db down"));

    await expect(refreshSummaryFreshness("p1", 4, page)).resolves.toBeUndefined();
  });
});
