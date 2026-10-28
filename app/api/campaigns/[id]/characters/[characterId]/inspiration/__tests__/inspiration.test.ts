import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterRow: vi.fn() }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (inspiration: boolean) =>
  vi.mocked(access.requireCharacterRow).mockResolvedValue({
    access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration } } } },
    character: { id: "ch", campaignId: "camp" },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST inspiration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM only", async () => {
    gate(true);
    await post({ value: true });

    expect(access.requireCharacterRow).toHaveBeenCalledWith("camp", "ch", { dmOnly: true });
  });

  it("sets the flag and logs", async () => {
    gate(true);

    const res = await post({ value: true });

    expect(await res.json()).toEqual({ inspiration: true });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "ch" }, data: { inspiration: true } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "inspiration", data: { value: true } })] });
  });

  it("409 when inspiration is off", async () => {
    gate(false);

    expect((await post({ value: true })).status).toBe(409);
  });

  it("409 while the hero is in an active battle", async () => {
    gate(true);
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "bp" } as never);

    const res = await post({ value: true });

    expect(res.status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
