import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

const queryRaw = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: (...args: unknown[]) => queryRaw(...args) } }));

import { isWfrpCampaign } from "../system-key";

describe("isWfrpCampaign", () => {
  beforeEach(() => queryRaw.mockReset());

  it.each([
    [[{ wfrp: true }], true],
    [[], false],
    [[{ wfrp: null }], false],
    [[{ wfrp: false }], false],
  ])("%j -> %s", async (rows, expected) => {
    queryRaw.mockResolvedValue(rows);

    expect(await isWfrpCampaign("c1")).toBe(expected);
  });
});
