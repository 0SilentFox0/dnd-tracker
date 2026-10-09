import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";
import { createCharacterSchema } from "@/app/api/campaigns/[id]/characters/create-character-schema";
import { prisma } from "@/lib/db";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireAuth: vi.fn(), requireDM: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn(), update: vi.fn() },
    campaign: { findUnique: vi.fn() },
    race: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));

describe("updateCharacterSchema", () => {
  it("приймає primaryAbility і background", () => {
    const parsed = updateCharacterSchema.parse({ primaryAbility: "dexterity", background: "Текст ==важливе==" });

    expect(parsed.primaryAbility).toBe("dexterity");
    expect(parsed.background).toBe("Текст ==важливе==");
  });

  it("цілі через PATCH не приймаються — лише через /goals з його правилами", () => {
    const parsed = updateCharacterSchema.parse({ goals: [{ id: "g1", text: "Підробка", status: "active", author: "dm" }] }) as Record<string, unknown>;

    expect(parsed.goals).toBeUndefined();
  });

  it("null знімає основну характеристику, невідомий ключ — помилка", () => {
    expect(updateCharacterSchema.parse({ primaryAbility: null }).primaryAbility).toBeNull();
    expect(() => updateCharacterSchema.parse({ primaryAbility: "luck" })).toThrow();
  });

  it("мертві поля відкидаються", () => {
    const parsed = updateCharacterSchema.parse({ ideals: "x", hitDice: "1d8", proficiencyBonus: 2, maxHp: 30, currentHp: 20, tempHp: 5, spellcastingClass: "wizard" }) as Record<string, unknown>;

    for (const key of ["ideals", "hitDice", "proficiencyBonus", "maxHp", "currentHp", "tempHp", "spellcastingClass"]) expect(parsed[key]).toBeUndefined();
  });

  it("створення теж відкидає HP і клас заклинань", () => {
    const parsed = createCharacterSchema.parse({ name: "Ліра", type: "player", controlledBy: "u", class: "Ranger", race: "Ельф", maxHp: 30, currentHp: 20, tempHp: 5, spellcastingClass: "wizard" }) as Record<string, unknown>;

    for (const key of ["maxHp", "currentHp", "tempHp", "spellcastingClass"]) expect(parsed[key]).toBeUndefined();
  });

  it("порожні nullable-колонки з БД (null) не ламають збереження", () => {
    const parsed = updateCharacterSchema.parse({ subclass: null, subrace: null, alignment: null, background: null, avatar: null });

    expect(parsed.subclass).toBeNull();
    expect(parsed.background).toBeNull();
  });
});

describe("PATCH archetype", () => {
  const params = { params: Promise.resolve({ id: "camp", characterId: "ch" }) };

  const access = (userId: string, isDM: boolean) =>
    ({ userId, isDM, campaign: { id: "camp", maxLevel: 20, xpMultiplier: 1 } }) as never;

  const patch = async (body: unknown) => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/characters/[characterId]/route");

    return (await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params)) as NextResponse;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "ch", campaignId: "camp", level: 3, experience: 0, race: "Ельф", controlledBy: "owner", type: "player", archetype: "rogue" } as never);
    vi.mocked(prisma.character.update).mockResolvedValue({ id: "ch" } as never);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ allowPlayerEdit: true } as never);
    vi.mocked(prisma.race.findFirst).mockResolvedValue(null);
  });

  it("ДМ міняє архетип; невідомий ключ — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", true));

    expect((await patch({ archetype: "mage" })).status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({ archetype: "mage" });
    expect((await patch({ archetype: "bard" })).status).toBe(400);
  });

  it("власник не міняє архетип, решта правок проходить", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", false));

    expect((await patch({ archetype: "mage", name: "Нове" })).status).toBe(200);

    const data = vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.name).toBe("Нове");
    expect(data.archetype).toBeUndefined();
  });

  it("власник не міняє аватар: зовнішній URL не доходить до збереження", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", false));

    expect((await patch({ avatar: "http://169.254.169.254/x", name: "Нове" })).status).toBe(200);
    expect(resolveAvatarForPersistence).toHaveBeenCalledWith(undefined, expect.anything());
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data.avatar).toBeUndefined();
  });
});
