import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedClasses: vi.fn(async () => [{ id: "fig", name: "Воїн", hitDie: 10, caster: "none", savingThrows: [], proficiencies: {}, skillChoices: {}, features: [], subclasses: [], subclassLevel: 3 }]),
}));
vi.mock("@/lib/db", () => {
  const prisma = { character: { findMany: vi.fn(), update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const rules = (persistResources: boolean) => ({ ...DEFAULT_RULES, classes: { enabled: true }, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources } });

const asDM = (persist = true) => vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: rules(persist) } } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

describe("POST /rest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("409 when persistResources is off", async () => {
    asDM(false);

    expect((await post({ kind: "short", characterIds: ["a"] })).status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("400 when an id is foreign, missing or pending — nothing written", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: {} }] as never);

    const res = await post({ kind: "long", characterIds: ["a", "foreign"] });

    expect(res.status).toBe(400);
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });

  it("long rest restores, returns new resources and logs", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [{ classId: "fig", level: 4 }], resources: { hp: 3, hitDiceSpent: { fig: 4 }, exhaustion: 1, shortRestOpen: true } }] as never);

    const res = await post({ kind: "long", characterIds: ["a"] });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ characters: [{ id: "a", resources: { hitDiceSpent: { fig: 2 } } }] });
    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["a"] }, campaignId: "camp", status: "active" } }));
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "a", kind: "long_rest", actorUserId: "dm" })] });
  });

  it("short rest opens the hit dice window", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: { slotsSpent: { pact: 1 } } }] as never);

    expect(await (await post({ kind: "short", characterIds: ["a"] })).json()).toEqual({ characters: [{ id: "a", resources: { shortRestOpen: true } }] });
  });

  it("player gets the 403 from requireDM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post({ kind: "short", characterIds: ["a"] })).status).toBe(403);
  });

  it("409 when any selected hero is in an active battle — nothing written", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: {} }] as never);
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "bp" } as never);

    const res = await post({ kind: "long", characterIds: ["a"] });

    expect(res.status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });

  it("dead hero is skipped and gets no log row", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", classes: [], resources: { dead: true, hp: 0 } }, { id: "b", classes: [], resources: {} }] as never);

    await post({ kind: "short", characterIds: ["a", "b"] });

    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ characterId: "b" })] });
  });
});
