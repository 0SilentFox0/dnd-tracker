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

  it("maps rows and drops null or blank digests", async () => {
    queryRaw.mockResolvedValue([
      { id: "a", title: "A", sortOrder: 1, digest: "d", stale: true },
      { id: "b", title: "B", sortOrder: 2, digest: null, stale: false },
      { id: "c", title: "C", sortOrder: 3, digest: "  ", stale: false },
    ]);

    expect(await loadDigestItems("camp")).toEqual([{ id: "a", title: "A", sortOrder: 1, digest: "d", stale: true }]);
  });

  it("orders rows deterministically", async () => {
    queryRaw.mockResolvedValue([]);

    await loadDigestItems("camp");

    expect((queryRaw.mock.calls[0][0] as string[]).join("")).toContain('ORDER BY p."sortOrder", p.title, p.id');
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
