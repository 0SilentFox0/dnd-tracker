import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findFirst: vi.fn(), updateMany: vi.fn() },
    skillTree: { findFirst: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
  },
}));

const access = (userId: string, role: "dm" | "player") =>
  ({ userId, authUser: { id: userId, email: null, user_metadata: null }, campaign: { id: "camp", maxLevel: 20, xpMultiplier: 1, members: [{ userId, role }] } }) as never;

const CHAR = { id: "ch", level: 3, race: "Ельф", skillTreeProgress: { "json-id": { unlockedSkills: ["attack_basic_level"] } }, seenLevel: 2, controlledBy: "owner" };

const TREE_ROW = { id: "row-id", campaignId: "camp", race: "Ельф", createdAt: new Date(), skills: buildTreeJson({ id: "json-id", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] }) };

const params = { params: Promise.resolve({ id: "camp", characterId: "ch" }) };

const post = async (action: string, body?: unknown) => {
  const mod = await import(`@/app/api/campaigns/[id]/characters/[characterId]/progression/${action}/route`);

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body ?? {}) }), params) as Promise<NextResponse>;
};

describe("progression actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findFirst).mockResolvedValue({ ...CHAR, level: 3 } as never);
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(TREE_ROW as never);
    vi.mocked(prisma.character.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("власник без allowPlayerEdit вчить; запис під id рядка з guard на прочитаний прогрес і рівень", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("learn", { nodeId: "o1" });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ unlocked: ["attack_basic_level", "o1"] });

    const call = vi.mocked(prisma.character.updateMany).mock.calls[0][0];

    expect(call.where).toEqual({ id: "ch", level: 3, skillTreeProgress: { equals: CHAR.skillTreeProgress } });
    expect(call.data).toEqual({ skillTreeProgress: { "row-id": { unlockedSkills: ["attack_basic_level", "o1"] } } });
  });

  it("JSON null у прогресі ('null'::jsonb): вивчення працює, guard порівнює з JsonNull", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    vi.mocked(prisma.character.findFirst).mockResolvedValue({ ...CHAR, skillTreeProgress: null } as never);

    const res = await post("learn", { nodeId: "attack_basic_level" });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual({ unlocked: ["attack_basic_level"] });

    const call = vi.mocked(prisma.character.updateMany).mock.calls[0][0];

    expect(call.where).toEqual({ id: "ch", level: 3, skillTreeProgress: { equals: Prisma.JsonNull } });
    expect(call.data).toEqual({ skillTreeProgress: { "row-id": { unlockedSkills: ["attack_basic_level"] } } });
  });

  it("порушення правил → 422 з reason", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("learn", { nodeId: "attack_expert_level" });

    expect(res.status).toBe(422);
    expect(await getResponseJson(res)).toEqual({ reason: "branchOrder" });
  });

  it("паралельна зміна прогресу → 409", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    vi.mocked(prisma.character.updateMany).mockResolvedValue({ count: 0 } as never);

    expect((await post("learn", { nodeId: "o1" })).status).toBe(409);
  });

  it("unlearn і reset — лише DM", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));
    expect((await post("unlearn", { nodeIds: ["attack_basic_level"] })).status).toBe(403);
    expect((await post("reset")).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect(await getResponseJson(await post("unlearn", { nodeIds: ["attack_basic_level"] }))).toEqual({ unlocked: [] });
    expect(await getResponseJson(await post("reset"))).toEqual({ unlocked: [] });
  });

  it("DM прибирає кілька вузлів (сироти) одним запитом", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.character.findFirst).mockResolvedValue({ ...CHAR, skillTreeProgress: { "json-id": { unlockedSkills: ["attack_basic_level", "gone-1", "gone-2"] } } } as never);

    const res = await post("unlearn", { nodeIds: ["gone-1", "gone-2"] });

    expect(await getResponseJson(res)).toEqual({ unlocked: ["attack_basic_level"] });
    expect(prisma.character.updateMany).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.character.updateMany).mock.calls[0][0].data).toEqual({ skillTreeProgress: { "row-id": { unlockedSkills: ["attack_basic_level"] } } });
  });

  it("unlearn: порожній список — 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

    expect((await post("unlearn", { nodeIds: [] })).status).toBe(400);
  });

  it("seen-level — лише власник, ставить поточний рівень", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    expect((await post("seen-level")).status).toBe(403);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const res = await post("seen-level");

    expect(await getResponseJson(res)).toEqual({ seenLevel: 3 });
    expect(vi.mocked(prisma.character.updateMany).mock.calls[0][0]).toEqual({ where: { id: "ch" }, data: { seenLevel: 3 } });
  });

  it("невалідне тіло → 400", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    expect((await post("learn", { nodeId: "" })).status).toBe(400);
  });
});
