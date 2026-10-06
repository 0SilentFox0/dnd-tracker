import { NextResponse } from "next/server";
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
    race: { findFirst: vi.fn() },
    skill: { findMany: vi.fn() },
    mainSkill: { findMany: vi.fn() },
  },
}));

const access = (userId: string, role: "dm" | "player") =>
  ({ userId, authUser: { id: userId, email: null, user_metadata: null }, campaign: { id: "camp", maxLevel: 20, xpMultiplier: 1, members: [{ userId, role }] } }) as never;

const CHAR = { id: "ch", level: 3, race: "Ельф", skillTreeProgress: { "json-id": { unlockedSkills: ["attack_basic_level"] } }, seenLevel: 2, controlledBy: "owner" };

const TREE_ROW = { id: "row-id", campaignId: "camp", race: "Ельф", createdAt: new Date(), skills: buildTreeJson({ id: "json-id", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] }) };

const params = { params: Promise.resolve({ id: "camp", characterId: "ch" }) };

describe("GET progression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findFirst).mockResolvedValue(CHAR as never);
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(TREE_ROW as never);
    vi.mocked(prisma.skill.findMany).mockResolvedValue([{ id: "o1", name: "Кровопуск", icon: null, description: "опис", abilities: [], basicInfo: null, spellGroupId: null, spellNewSpellId: null }] as never);
    vi.mocked(prisma.mainSkill.findMany).mockResolvedValue([{ id: "attack", name: "Напад", color: "red", icon: null, spellGroupId: null }] as never);
    vi.mocked(prisma.race.findFirst).mockResolvedValue({ icon: "/elf.png" } as never);
  });

  it("власник отримує дерево, вивчене (фолбек JSON id), лише скіли дерева", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    const body = await getResponseJson<Record<string, unknown>>(await GET(new Request("http://x"), params) as NextResponse);

    expect(body).toMatchObject({ treeId: "row-id", level: 3, seenLevel: 2, isOwner: true, isDM: false, unlocked: ["attack_basic_level"] });
    expect(Object.keys(body.skills as object)).toEqual(["o1"]);
    expect(body.raceIcon).toBe("/elf.png");
    expect(vi.mocked(prisma.race.findFirst).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp", name: "Ельф" } });
    expect(vi.mocked(prisma.skill.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp", id: { in: ["o1"] } } });
  });

  it("скіли дерева читаються лише колонками, потрібними DTO (egress)", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("owner", "player"));

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    await GET(new Request("http://x"), params);

    const { select } = vi.mocked(prisma.skill.findMany).mock.calls[0][0] as { select?: Record<string, boolean> };

    expect(Object.keys(select ?? {}).sort()).toEqual([
      "abilities", "bonuses", "combatStats", "description", "icon", "id", "name", "skillTriggers", "spellData", "spellEnhancementData", "spellGroupId", "spellNewSpellId",
    ]);
  });

  it("чужий гравець — 403", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("stranger", "player"));

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    expect((await GET(new Request("http://x"), params)).status).toBe(403);
  });

  it("без дерева — treeId null", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
    vi.mocked(prisma.skillTree.findFirst).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/characters/[characterId]/progression/route");

    const body = await getResponseJson<Record<string, unknown>>(await GET(new Request("http://x"), params) as NextResponse);

    expect(body).toMatchObject({ treeId: null, tree: null, isDM: true, unlocked: [] });
  });
});
