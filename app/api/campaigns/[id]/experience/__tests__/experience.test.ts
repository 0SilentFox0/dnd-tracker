import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => {
  const prisma = { character: { findMany: vi.fn(), update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const asDM = (xp = true) => vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, xp } } } } as never);

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp" }) }) as Promise<NextResponse>;
};

describe("POST /experience", () => {
  beforeEach(() => vi.clearAllMocks());

  it("409 when the XP table is off", async () => {
    asDM(false);

    expect((await post({ characterIds: ["a"], amount: 100 })).status).toBe(409);
  });

  it("split divides evenly and logs each hero", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 0 }, { id: "b", experience: 100 }, { id: "c", experience: 7 }] as never);

    const res = await post({ characterIds: ["a", "b", "c"], amount: 1000, split: true, note: "Дракон" });

    expect(await res.json()).toEqual({ characters: [{ id: "a", experience: 333 }, { id: "b", experience: 433 }, { id: "c", experience: 340 }] });
    expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { experience: 433 } });
    expect(prisma.characterLog.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ characterId: "a", kind: "xp", data: { amount: 333, total: 333, note: "Дракон" } })]) });
  });

  it("negative amount never goes below 0", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 50 }] as never);

    expect(await (await post({ characterIds: ["a"], amount: -100 })).json()).toEqual({ characters: [{ id: "a", experience: 0 }] });
  });

  it("400 for a foreign id and for amount 0", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 0 }] as never);

    expect((await post({ characterIds: ["a", "x"], amount: 10 })).status).toBe(400);
    expect((await post({ characterIds: ["a"], amount: 0 })).status).toBe(400);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("zero share writes nothing", async () => {
    asDM();
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "a", experience: 5 }, { id: "b", experience: 5 }, { id: "c", experience: 5 }] as never);

    const res = await post({ characterIds: ["a", "b", "c"], amount: 2, split: true });

    expect(res.status).toBe(200);
    expect(prisma.character.update).not.toHaveBeenCalled();
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
  });
});
