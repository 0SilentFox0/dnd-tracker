import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { patchCharacter } from "@/app/api/campaigns/[id]/characters/[characterId]/patch-character";
import { createCharacter } from "@/app/api/campaigns/[id]/characters/create-character";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { parseRules } from "@/lib/utils/rules/schema";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn(), requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/app/api/campaigns/[id]/characters/resolve-character-owner", () => ({ resolveCharacterOwner: vi.fn(async () => ({ controlledBy: "owner" })) }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    character: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    characterInventory: { create: vi.fn() },
    race: { findFirst: vi.fn() },
  },
}));

const access = (rules: unknown) => ({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, rules: parseRules(rules) } }) as never;

const create = (initiative: number) => {
  const body = { name: "Ліра", type: "player", controlledBy: "owner", class: "Wizard", race: "Маги", initiative };

  return createCharacter(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), "camp") as Promise<NextResponse>;
};

const patch = (body: object) => patchCharacter(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), "camp", "ch") as Promise<NextResponse>;

describe("ініціатива героя за правилами кампанії", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.race.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.character.create).mockImplementation((async (args: { data: object }) => ({ id: "c", ...args.data })) as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", controlledBy: "owner", level: 1, race: "Маги", type: "player", avatar: null } as never);
    vi.mocked(prisma.character.update).mockImplementation((async (args: { data: object }) => ({ id: "ch", ...args.data })) as never);
  });

  it("створення з 18 у кампанії з heroMax 20 — успіх", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access({ initiative: { heroMax: 20 } }));

    expect((await create(18)).status).toBe(200);
  });

  it("створення з 18 без правил — 400", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access({}));

    const res = await create(18);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("10–16");
    expect(prisma.character.create).not.toHaveBeenCalled();
  });

  it("PATCH перевіряє діапазон лише коли initiative є в тілі", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access({}));

    expect((await patch({ initiative: 18 })).status).toBe(400);
    expect((await patch({ name: "Нове" })).status).not.toBe(400);
  });

  it("PATCH з 18 у кампанії з heroMax 20 проходить", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access({ initiative: { heroMax: 20 } }));

    expect((await patch({ initiative: 18 })).status).toBe(200);
  });
});
