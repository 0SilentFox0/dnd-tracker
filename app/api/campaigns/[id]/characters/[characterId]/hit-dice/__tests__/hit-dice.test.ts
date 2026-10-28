import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({
  buildCharacterParticipant: vi.fn(async () => ({ context: { classesById: { fig: { id: "fig", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: 3 } } }, participant: { abilities: { modifiers: { constitution: 2 } }, combatStats: { maxHp: 30 } } })),
}));
vi.mock("@/lib/utils/common/dice", async (orig) => ({ ...(await orig<object>()), rollDie: vi.fn(() => 6) }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const rules = (persistResources = true) => ({ ...DEFAULT_RULES, classes: { enabled: true }, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } });

const gate = (resources: object, persist = true) =>
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: "owner", isDM: false, campaign: { id: "camp", maxLevel: 20, rules: rules(persist) } },
    character: { id: "ch", campaignId: "camp", classes: [{ classId: "fig", level: 3 }], resources },
  } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("POST hit-dice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("heals d10 + CON and counts the die", async () => {
    gate({ shortRestOpen: true, hp: 10 });

    const res = await post({ classId: "fig" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ die: 10, roll: 6, healed: 8, hpBefore: 10, hpAfter: 18, resources: { shortRestOpen: true, hp: 18, hitDiceSpent: { fig: 1 } } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "hit_die", actorUserId: "owner" })] });
  });

  it.each([
    [{ hp: 10 }, API_ERRORS.SHORT_REST_CLOSED],
    [{ shortRestOpen: true }, API_ERRORS.HP_FULL],
    [{ shortRestOpen: true, hp: 1, hitDiceSpent: { fig: 3 } }, API_ERRORS.NO_HIT_DICE],
    [{ shortRestOpen: true, hp: 0, dead: true }, API_ERRORS.CHARACTER_DEAD],
  ])("409 for %j", async (resources, error) => {
    gate(resources);

    const res = await post({ classId: "fig" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(error);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("409 when persistResources is off", async () => {
    gate({ shortRestOpen: true, hp: 1 }, false);

    expect((await post({ classId: "fig" })).status).toBe(409);
  });

  it("access errors pass through", async () => {
    vi.mocked(access.requireCharacterAccess).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post({ classId: "fig" })).status).toBe(403);
  });

  it("409 CHARACTER_IN_BATTLE while the hero is on the map of an active battle", async () => {
    gate({ shortRestOpen: true, hp: 1 });
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "bp" } as never);

    const res = await post({ classId: "fig" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.CHARACTER_IN_BATTLE);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("uses the row-locked resources, not the stale ones from the first read", async () => {
    gate({ shortRestOpen: true, hp: 10 });
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ id: "ch", resources: { shortRestOpen: true, hp: 10, hitDiceSpent: { fig: 3 } }, experience: 0 }] as never);

    const res = await post({ classId: "fig" });

    expect((await res.json()).error).toBe(API_ERRORS.NO_HIT_DICE);
  });
});

// Shared transaction SQL is exercised by character storage integration; retain the existing business DB doubles.
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: async (_id: string, fn: (tx: unknown) => unknown) => fn({ $queryRaw: async () => [], $executeRaw: async () => 1 }) }));
