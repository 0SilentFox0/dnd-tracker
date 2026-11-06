import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn(async () => ({ id: "a" })) } } }));

const stored = { campaignId: "camp", controlledBy: "u1", status: "pending", goals: [] };

const patch = async (data: object) => {
  const { updateDraft } = await import("../update-draft");

  return updateDraft(new Request("http://x", { method: "PATCH", body: JSON.stringify(data) }), "camp", "a");
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "u1", campaign: { id: "camp", maxLevel: 20, rules: WFRP_RULES, members: [] } } as never);
  vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
});

describe("patchWfrpDraft", () => {
  it("updates identity fields only, never mechanics", async () => {
    const res = await patch({ name: "Lia", background: "b", goals: [{ text: "g", kind: "main" }], characteristics: { base: {} }, experience: 9999, raceId: "x" });

    expect(res.status).toBe(200);

    const { data } = vi.mocked(prisma.character.update).mock.calls[0][0] as { data: Record<string, unknown> };

    expect(Object.keys(data).sort()).toEqual(["alignment", "avatar", "background", "goals", "name"]);
    expect(data.name).toBe("Lia");
  });

  it("403 for a non-owner", async () => {
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...stored, controlledBy: "other" } as never);

    expect((await patch({ name: "Lia" })).status).toBe(403);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("400 for a non-pending hero", async () => {
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...stored, status: "active" } as never);

    expect((await patch({ name: "Lia" })).status).toBe(400);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("403 for a hero of another campaign", async () => {
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ ...stored, campaignId: "other" } as never);

    expect((await patch({ name: "Lia" })).status).toBe(403);
  });
});
