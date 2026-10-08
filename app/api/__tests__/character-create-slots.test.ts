import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RACES } from "@/data/library/races";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/app/api/campaigns/[id]/characters/resolve-character-owner", () => ({ resolveCharacterOwner: vi.fn(async () => ({ controlledBy: "owner" })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { create: vi.fn() }, characterInventory: { create: vi.fn() }, race: { findFirst: vi.fn() } } }));

const create = async (level: number) => {
  const { createCharacter } = await import("@/app/api/campaigns/[id]/characters/create-character");

  const body = { name: "Ліра", type: "player", controlledBy: "owner", class: "Wizard", race: "Маги", level };

  return createCharacter(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), "camp") as Promise<NextResponse>;
};

const slots = () => (vi.mocked(prisma.character.create).mock.calls[0][0].data as { spellSlots: Record<string, { max: number }> }).spellSlots;

describe("створення персонажа: слоти за прогресією раси", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp" } } as never);
    vi.mocked(prisma.character.create).mockImplementation((async (args: { data: object }) => ({ id: "c", ...args.data })) as never);
  });

  it("рівень 9 раси бібліотеки: 4/3/3/2/1", async () => {
    vi.mocked(prisma.race.findFirst).mockResolvedValue({ spellSlotProgression: RACES[0].spellSlotProgression } as never);

    await create(9);

    expect(Object.fromEntries(Object.entries(slots()).map(([k, v]) => [k, v.max]))).toEqual({ "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 });
  });

  it("раса без прогресії — таблиця персонажів", async () => {
    vi.mocked(prisma.race.findFirst).mockResolvedValue(null);

    await create(1);

    expect(slots()).toEqual({ "1": { max: 2, current: 2 } });
  });
});
