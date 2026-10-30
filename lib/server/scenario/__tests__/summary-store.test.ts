import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("server-only", () => ({}));

import { loadDigestItems } from "@/lib/server/scenario/summary-store";

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
