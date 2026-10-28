import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftChoiceFields } from "../../../draft/draft-choices";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("../../../draft/draft-choices", () => ({ draftChoiceFields: vi.fn(async () => null) }));
vi.mock("@/lib/server/characters/core/derive-character-defaults", () => ({ deriveCharacterDefaults: vi.fn(async () => ({ spellSlots: {} })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn(async () => ({ id: "a" })) } } }));

const stored = { campaignId: "camp", controlledBy: "u1", status: "pending", race: "Elf", goals: [], skills: {}, raceChoices: { l: [{ id: "drow" }] }, feats: [], classes: [] };

const body = { name: "Lia", race: "Elf", method: "standard", strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8, archetype: "mage", class: "Маг" };

const put = async (data: object) => {
  const { updateDraft } = await import("../update-draft");

  return updateDraft(new Request("http://x", { method: "PUT", body: JSON.stringify(data) }), "camp", "a");
};

describe("updateDraft keeps stored picks when the form sends none", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u1", campaign: { id: "camp", maxLevel: 20, rules: DEFAULT_RULES, members: [] } } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
  });

  it("same race: stored race picks are passed on", async () => {
    const res = await put(body);

    expect(res.status).toBe(200);

    expect(vi.mocked(draftChoiceFields).mock.calls[0][0].data.choices).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [] });
  });

  it("changed race: old race picks are dropped", async () => {
    await put({ ...body, race: "Orc" });

    expect(vi.mocked(draftChoiceFields).mock.calls[0][0].data.choices).toBeUndefined();
  });
});
