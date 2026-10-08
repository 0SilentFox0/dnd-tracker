import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RACES } from "@/data/library/races";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(),
  requireCampaignAccess: vi.fn(),
  requireDM: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn(), update: vi.fn() },
    campaign: { findUnique: vi.fn() },
    race: { findFirst: vi.fn() },
  },
}));

const access = (role: "dm" | "player", maxLevel = 20) =>
  ({ userId: role === "dm" ? "dm" : "owner", isDM: role === "dm", campaign: { id: "camp", maxLevel, xpMultiplier: 2.5, members: [{ userId: role === "dm" ? "dm" : "owner", role }] } }) as never;

const CHARACTER = {
  id: "ch", campaignId: "camp", controlledBy: "owner", type: "player", race: "Ельф", level: 3, experience: 0, seenLevel: 3,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
  spellSlots: { "1": { max: 3, current: 1 } }, immunities: [],
};

const patch = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/route");

  return mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

const written = () => vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

const random = vi.spyOn(Math, "random");

describe("PATCH персонажа: рівень і слоти", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    random.mockReturnValue(0);
    vi.mocked(prisma.character.findUnique).mockResolvedValue(CHARACTER as never);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ allowPlayerEdit: true } as never);
    vi.mocked(prisma.race.findFirst).mockResolvedValue({ spellSlotProgression: [{ level: 1, slots: 4 }, { level: 2, slots: 3 }, { level: 3, slots: 3 }] } as never);
    vi.mocked(prisma.character.update).mockImplementation(((args: { data: object }) => Promise.resolve(args.data)) as never);
  });

  afterEach(() => random.mockReset());

  it("гравець не змінює рівень і XP; раса не читається", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("player"));

    const res = await patch({ level: 6, experience: 999_999, name: "Нове" });

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ level: 3, name: "Нове" });
    expect(written().experience).toBeUndefined();
    expect(written().spellSlots).toBeUndefined();
    expect(prisma.race.findFirst).not.toHaveBeenCalled();
  });

  it("ДМ: рівень понад maxLevel — 422 без запису", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", 3));

    const res = await patch({ level: 4 });

    expect(res.status).toBe(422);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("ДМ: персонаж на maxLevel з XP понад поріг — правка імені проходить, рівень не змінюється", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", 3));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...CHARACTER, experience: 999_999 } as never);

    const res = await patch({ name: "Нове", experience: 999_999 });

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ level: 3, name: "Нове" });
  });

  it("ДМ: нове XP понад maxLevel підвищує лише до maxLevel", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", 4));

    const res = await patch({ experience: 999_999 });

    expect(res.status).toBe(200);
    expect(written()).toMatchObject({ level: 4 });
  });

  it("ДМ: без зміни рівня слоти не перераховуються; ручна правка слотів проходить як є", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));

    await patch({ level: 3, name: "x" });
    expect(written().spellSlots).toBeUndefined();

    vi.mocked(prisma.character.update).mockClear();

    await patch({ level: 3, spellSlots: { "1": { max: 5, current: 5 } } });
    expect(written().spellSlots).toEqual({ "1": { max: 5, current: 5 } });
  });

  it("ДМ: +2 рівні — приріст слотів з прогресії раси поверх тіла, +1 на рівень поверх тіла, без HP", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));

    await patch({ level: 5, strength: 12, spellSlots: { "1": { max: 3, current: 1 }, universal: { max: 2, current: 2 } } });

    expect(written()).toMatchObject({
      level: 5,
      strength: 14,
      spellSlots: { "1": { max: 3, current: 1 }, "2": { max: 1, current: 1 }, "3": { max: 2, current: 2 }, universal: { max: 2, current: 2 } },
    });
    expect(written()).not.toHaveProperty("maxHp");
    expect(written()).not.toHaveProperty("currentHp");
  });

  it("ДМ: зниження рівня 9→5 — слоти за прогресією раси бібліотеки: 4/3/2", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm"));
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...CHARACTER, level: 9, seenLevel: 9, spellSlots: { "1": { max: 4, current: 1 }, "2": { max: 3, current: 3 }, "3": { max: 3, current: 3 }, "4": { max: 2, current: 2 }, "5": { max: 1, current: 1 } } } as never);
    vi.mocked(prisma.race.findFirst).mockResolvedValue({ spellSlotProgression: RACES[0].spellSlotProgression } as never);

    await patch({ level: 5 });

    expect(written().spellSlots).toEqual({ "1": { max: 4, current: 1 }, "2": { max: 3, current: 3 }, "3": { max: 2, current: 2 } });
  });
});
