import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));

import { featInUse } from "@/lib/server/feats/feat-usage";

describe("featInUse", () => {
  it("searches the quoted id in feats, raceChoices and classes of the campaign", async () => {
    queryRaw.mockResolvedValueOnce([{ count: BigInt(2) }]);

    expect(await featInUse("c1", "f1")).toBe(true);

    const [strings, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];

    expect(strings.join("?")).toContain(`"raceChoices"::text LIKE`);
    expect(values).toEqual(["c1", `%"f1"%`, `%"f1"%`, `%"f1"%`]);

    queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);

    expect(await featInUse("c1", "f1")).toBe(false);
  });
});
