import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn(async () => ({ participant: createMockParticipant() })) }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { updateMany: vi.fn(async () => ({ count: 1 })) }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (inspirationRule: boolean) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "owner", isDM: false, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: inspirationRule } } } },
    character: { id: "ch", campaignId: "camp", inspiration: true },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST roll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skill check without inspiration: result + log, inspiration untouched", async () => {
    gate(true);

    const res = await post({ kind: "check", skill: "stealth" });

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ mode: "normal", inspirationUsed: false });
    expect(json.total).toBe(json.roll + json.mod + json.bonus);
    expect(prisma.character.updateMany).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "check" })] });
  });

  it("inspiration spends the flag and rolls with advantage", async () => {
    gate(true);

    const json = await (await post({ kind: "save", ability: "wisdom", useInspiration: true })).json();

    expect(json).toMatchObject({ mode: "advantage", inspirationUsed: true });
    expect(json.rolls).toHaveLength(2);
    expect(prisma.character.updateMany).toHaveBeenCalledWith({ where: { id: "ch", inspiration: true }, data: { inspiration: false } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "save" })] });
  });

  it("no inspiration left → 409, nothing logged", async () => {
    gate(true);
    vi.mocked(prisma.character.updateMany).mockResolvedValueOnce({ count: 0 } as never);

    const res = await post({ kind: "check", ability: "strength", useInspiration: true });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.NO_INSPIRATION);
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });

  it("inspiration rule off → 409", async () => {
    gate(false);

    expect((await post({ kind: "check", skill: "stealth", useInspiration: true })).status).toBe(409);
  });

  it("invalid skill → 400", async () => {
    gate(true);

    expect((await post({ kind: "check", skill: "flying" })).status).toBe(400);
  });

  it("inspired roll → 409 while the hero is in an active battle; plain roll stays allowed", async () => {
    gate(true);
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue({ id: "bp" } as never);

    const blocked = await post({ kind: "check", skill: "stealth", useInspiration: true });

    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error).toBe(API_ERRORS.CHARACTER_IN_BATTLE);
    expect(prisma.character.updateMany).not.toHaveBeenCalled();
    expect((await post({ kind: "check", skill: "stealth" })).status).toBe(200);

    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValue(null);
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
