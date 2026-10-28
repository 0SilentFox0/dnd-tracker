import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import * as participant from "@/lib/server/characters/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn(async () => ({ participant: { combatStats: { maxHp: 30 } } })) }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const gate = (persistResources = true) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } } } },
    character: { id: "ch", campaignId: "camp", resources: { hp: 4, exhaustion: 2 } },
  } as never);

const patch = async (body: object) => {
  const { PATCH } = await import("../route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PATCH resources", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM only; 409 when persistResources is off", async () => {
    gate(false);

    expect((await patch({ exhaustion: 0 })).status).toBe(409);
    expect(access.requireCharacterAccess).toHaveBeenCalledWith("camp", "ch", { dmOnly: true });
  });

  it("heals to full via hp = max and logs before/after", async () => {
    gate();

    const res = await patch({ hp: 30 });

    expect(await res.json()).toEqual({ resources: { exhaustion: 2 } });
    expect(participant.buildCharacterParticipant).toHaveBeenCalledTimes(1);
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "resources_edit", data: { before: { hp: 4, exhaustion: 2 }, after: { exhaustion: 2 } } })] });
  });

  it("without hp the participant is not built", async () => {
    gate();
    await patch({ exhaustion: 0 });

    expect(participant.buildCharacterParticipant).not.toHaveBeenCalled();
  });

  it("empty body → 400", async () => {
    gate();

    expect((await patch({})).status).toBe(400);
  });

  it("409 while the hero is in an active battle", async () => {
    gate();
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "bp" } as never);

    const res = await patch({ exhaustion: 0 });

    expect(res.status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});
