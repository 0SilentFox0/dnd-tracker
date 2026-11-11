import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const entries = new Map<string, unknown>();

  const cache = (fn: (...args: never[]) => unknown) => (...args: never[]) => {
    const key = JSON.stringify(args);

    if (!entries.has(key)) entries.set(key, fn(...args));

    return entries.get(key);
  };

  return { entries, cache, findUnique: vi.fn(), getAuthUser: vi.fn() };
});

vi.mock("react", () => ({ cache: mocks.cache }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((href: string) => { throw new Error(`redirect:${href}`); }) }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mocks.getAuthUser }));
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: mocks.findUnique } } }));

import { getCampaignForLayout, requireCampaignMember } from "@/lib/server/campaigns/access";

describe("campaign layout access cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entries.clear();
    mocks.getAuthUser.mockResolvedValue({ id: "u1" });
    mocks.findUnique.mockResolvedValue({ id: "c1", kind: "demo", members: [] });
  });

  it("shares the same campaign lookup between layout gating and route access", async () => {
    await getCampaignForLayout("c1", "u1");

    const result = await requireCampaignMember("c1");

    expect(result.isDemo).toBe(true);
    expect(mocks.findUnique).toHaveBeenCalledTimes(1);
  });
});
