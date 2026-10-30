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

  const sql = (call = 0) => (queryRaw.mock.calls[call][0] as string[]).join("?");

  const outline = [{ id: "s1", title: "Intro", played: true }, { id: "s2", title: "Fight", played: false }];

  const row = (over: Record<string, unknown> = {}) => ({ id: "a", title: "A", arc: null, sortOrder: 1, facts: null, digest: null, stale: null, outline, ...over });

  const ref = (type: string, id: string, label: string, count: number, secret = false) => ({ type, id, label, count, secret });

  const facts = { sections: [
    { id: "s1", title: "Intro", played: true, refs: [ref("unit", "u1", "Wolf", 2), ref("unit", "u2", "", 9)] },
    { id: "s2", title: "Fight", played: false, refs: [ref("unit", "u1", "Wolf", 1), ref("character", "c1", "Zehir", 4)] },
  ] };

  it("builds sections from the outline, leads from the second query and ranked entities from facts", async () => {
    queryRaw.mockResolvedValueOnce([row({ facts })]).mockResolvedValueOnce([{ id: "a", leads: ["s1\tIntro The wolves howl", "s2\tFight"] }]);

    expect(await loadDigestItems("camp")).toEqual([
      { id: "a", title: "A", arc: null, sortOrder: 1, llm: null, sections: [{ title: "Intro", played: true, lead: "The wolves howl" }, { title: "Fight", played: false, lead: "" }], entities: ["Zehir", "Wolf"] },
    ]);
  });

  it("keeps sections and played marks without a current index; entities are empty", async () => {
    queryRaw.mockResolvedValueOnce([row()]).mockResolvedValueOnce([{ id: "a", leads: [] }]);

    const [page] = await loadDigestItems("camp");

    expect(page.entities).toEqual([]);
    expect(page.sections).toEqual([{ title: "Intro", played: true, lead: "" }, { title: "Fight", played: false, lead: "" }]);
  });

  it("ignores invalid facts and a missing outline", async () => {
    queryRaw.mockResolvedValueOnce([row({ facts: { sections: "nope" }, outline: null })]).mockResolvedValueOnce([]);

    expect(await loadDigestItems("camp")).toMatchObject([{ sections: [], entities: [] }]);
  });

  it("keeps pages without summaries and maps llm digest with stale; blank digest is ignored", async () => {
    queryRaw.mockResolvedValueOnce([row({ digest: "d", stale: true }), row({ id: "b", digest: "  ", stale: false }), row({ id: "c" })]).mockResolvedValueOnce([]);

    const pages = await loadDigestItems("camp");

    expect(pages.map((p) => p.llm)).toEqual([{ digest: "d", stale: true }, null, null]);
  });

  it("limits entities to digestEntities", async () => {
    const many = { sections: [{ id: "s", title: "T", played: false, refs: Array.from({ length: 20 }, (_, i) => ref("unit", `u${i}`, `E${i}`, 1)) }] };

    queryRaw.mockResolvedValueOnce([row({ facts: many })]).mockResolvedValueOnce([]);

    expect((await loadDigestItems("camp"))[0].entities).toHaveLength(12);
  });

  it("skips secret refs and keys entities by type and id, keeping the first non-empty label", async () => {
    const f = { sections: [
      { id: "s1", title: "T", played: false, refs: [ref("unit", "u1", "", 1), ref("unit", "u2", "Hidden", 50, true), ref("character", "u1", "Hero", 2)] },
      { id: "s2", title: "T2", played: false, refs: [ref("unit", "u1", "Wolf", 1), ref("unit", "u1", "Other", 1)] },
    ] };

    queryRaw.mockResolvedValueOnce([row({ facts: f })]).mockResolvedValueOnce([]);

    expect((await loadDigestItems("camp"))[0].entities).toEqual(["Wolf", "Hero"]);
  });

  it("marks leads cut by the SQL scan width with an ellipsis", async () => {
    const full = "x".repeat(150);

    queryRaw.mockResolvedValueOnce([row({ outline: [{ id: "s1", title: "Intro", played: false }] })]).mockResolvedValueOnce([{ id: "a", leads: [`s1\t${full}`] }]);

    const [page] = await loadDigestItems("camp");

    expect(page.sections[0].lead).toBe(`${"x".repeat(90)}…`);
  });

  it("skips the leads query when leads cannot fit the budget", async () => {
    const big = Array.from({ length: 60 }, (_, i) => row({ id: `p${i}`, outline: Array.from({ length: 3 }, (_, j) => ({ id: `s${j}`, title: `Section ${j}`, played: false })) }));

    queryRaw.mockResolvedValueOnce(big);

    const pages = await loadDigestItems("camp");

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(pages).toHaveLength(60);
    expect(pages[0].sections.every((s) => s.lead === "")).toBe(true);
  });

  it("fetches leads in a second query limited to the campaign pages without an llm digest", async () => {
    queryRaw.mockResolvedValueOnce([row(), row({ id: "b", digest: "d" })]).mockResolvedValueOnce([]);

    await loadDigestItems("camp");

    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(sql(1)).toContain("p.id = ANY(");
    expect(queryRaw.mock.calls[1].slice(1)).toContainEqual(["a"]);
  });

  it("uses LEFT JOINs, a version-gated index and orders deterministically", async () => {
    queryRaw.mockResolvedValueOnce([]);

    await loadDigestItems("camp");

    expect(sql()).toContain("LEFT JOIN scenario_page_index");
    expect(sql()).toContain("LEFT JOIN scenario_page_summaries");
    expect(sql()).toContain("i.version = p.version");
    expect(sql()).toContain('ORDER BY p."sortOrder", p.title, p.id');
    expect(sql()).not.toContain("CASE WHEN");
  });

  it("reads content only inside the outline aggregate and never the whole searchText", async () => {
    queryRaw.mockResolvedValueOnce([row()]).mockResolvedValueOnce([]);

    await loadDigestItems("camp");

    for (const call of [0, 1]) {
      expect(sql(call)).not.toMatch(/p\.\*|SELECT\s+\*/i);
      expect(sql(call)).not.toMatch(/SELECT[^()]*p\."searchText"\s*[,\n]/);
    }

    expect(sql().match(/p\.content/g)).toHaveLength(1);
    expect(sql()).toMatch(/FROM jsonb_array_elements\(p\.content->'sections'\)/);
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
