import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), validateCampaignOwnership: vi.fn(() => null) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn() }, race: { findFirst: vi.fn() } } }));

const dm = (maxLevel = 20) => ({ userId: "dm", campaign: { id: "camp", maxLevel, xpMultiplier: 2.5, members: [{ userId: "dm", role: "dm" }] } }) as never;

const CHARACTER = {
  id: "ch", campaignId: "camp", race: "Ельф", level: 3, seenLevel: 3,
  strength: 30, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
  spellSlots: { "1": { max: 3, current: 1 } },
};

const post = async () => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/level-up/route");

  return mod.POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

const random = vi.spyOn(Math, "random");

describe("POST level-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    random.mockReturnValue(0);
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm());
    vi.mocked(prisma.character.findUnique).mockResolvedValue(CHARACTER as never);
    vi.mocked(prisma.race.findFirst).mockResolvedValue({ spellSlotProgression: [{ level: 1, slots: 20 }] } as never);
    vi.mocked(prisma.character.update).mockImplementation(((args: { data: object }) => Promise.resolve({ ...CHARACTER, ...args.data })) as never);
  });

  afterEach(() => random.mockReset());

  it("+1 до характеристики не на стелі, слоти — приріст з прогресії раси, HP не змінюється", async () => {
    const res = await post();

    expect(res.status).toBe(200);

    const data = vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

    expect(data).toMatchObject({ level: 4, strength: 30, dexterity: 11, spellSlots: { "1": { max: 4, current: 2 } } });
    expect(data).not.toHaveProperty("maxHp");
    expect(data).not.toHaveProperty("currentHp");
    expect(await getResponseJson(res)).toMatchObject({ levelUpDetails: { abilityIncreased: "dexterity" } });
  });

  it("на максимальному рівні кампанії — 422, без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm(3));

    const res = await post();

    expect(res.status).toBe(422);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });
});
