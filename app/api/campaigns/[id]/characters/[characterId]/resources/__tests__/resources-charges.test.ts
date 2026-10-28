import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as access from "@/lib/server/characters/access";
import * as participant from "@/lib/server/characters/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({
  buildCharacterParticipant: vi.fn(async () => ({ participant: { combatStats: { maxHp: 30 }, battleData: { pools: { "pool:item:wand": { label: "Wand", max: 7, rest: "long" } } } } })),
}));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const patch = async (body: object) => {
  const { PATCH } = await import("../route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PATCH resources: item charges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(access.requireCharacterAccess).mockResolvedValue({
      access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true } } } },
      character: { id: "ch", campaignId: "camp", resources: {} },
    } as never);
  });

  it("DM sets spent charges of a known item pool", async () => {
    const res = await patch({ charges: { "pool:item:wand": 1 } });

    expect(await res.json()).toEqual({ resources: { charges: { "pool:item:wand": { used: 1, rest: "long" } } } });
    expect(participant.buildCharacterParticipant).toHaveBeenCalledTimes(1);
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
