import { NextResponse } from "next/server";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { createRequest,getResponseJson, getResponseStatus } from "./helpers";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireAuth: vi.fn(),
  requireDM: vi.fn(),
  requireCampaignAccess: vi.fn(),
  validateCampaignOwnership: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("GET /api/campaigns/[id]/skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо немає доступу до кампанії", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { GET } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 200 та масив скілів при успішному доступі", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });

    const mockSkills = [
      {
        id: "skill-1",
        campaignId: "c1",
        name: "Fireball",
        description: null,
        icon: null,
        basicInfo: { name: "Fireball", description: null },
        bonuses: {},
        combatStats: {},
        spellData: null,
        spellEnhancementData: null,
        mainSkillData: null,
        skillTriggers: [],
        spell: null,
        spellGroup: null,
        grantedSpell: null,
        mainSkill: null,
        image: null,
        damage: null,
        armor: null,
        speed: null,
        physicalResistance: null,
        magicalResistance: null,
        spellId: null,
        spellGroupId: null,
        grantedSpellId: null,
        mainSkillId: null,
        spellEnhancementTypes: [],
        spellEffectIncrease: null,
        spellTargetChange: null,
        spellAdditionalModifier: null,
        spellNewSpellId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.skill.findMany).mockResolvedValue(mockSkills as never);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response);

    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(1);
  });

  it("повертає порожній масив, якщо скілів немає", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });
    vi.mocked(prisma.skill.findMany).mockResolvedValue([]);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response);

    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBe(0);
  });
});

describe("POST /api/campaigns/[id]/skills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { POST } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills", {
      method: "POST",
      body: JSON.stringify({
        basicInfo: { name: "New Skill" },
        combatStats: {},
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 400 при невалідному body (відсутнє basicInfo.name)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });

    const { POST } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills", {
      method: "POST",
      body: JSON.stringify({ basicInfo: {}, combatStats: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(400);
    consoleErrorSpy.mockRestore();
  });

  it("повертає 200 та створений скіл при валідному body", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });

    const created = {
      id: "skill-new",
      campaignId: "c1",
      name: "New Skill",
      description: null,
      icon: null,
      basicInfo: { name: "New Skill" },
      bonuses: {},
      combatStats: {},
      spellData: null,
      spellEnhancementData: null,
      mainSkillData: null,
      skillTriggers: [],
      spell: null,
      spellGroup: null,
      grantedSpell: null,
      mainSkill: null,
      image: null,
      damage: null,
      armor: null,
      speed: null,
      physicalResistance: null,
      magicalResistance: null,
      spellId: null,
      spellGroupId: null,
      grantedSpellId: null,
      mainSkillId: null,
      spellEnhancementTypes: [],
      spellEffectIncrease: null,
      spellTargetChange: null,
      spellAdditionalModifier: null,
      spellNewSpellId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.skill.create).mockResolvedValue(created as never);

    const { POST } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills", {
      method: "POST",
      body: JSON.stringify({
        basicInfo: { name: "New Skill" },
        combatStats: {},
        spellData: {},
        spellEnhancementData: {},
        mainSkillData: {},
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { id: string; name: string };

    expect(data.id).toBe("skill-new");
    expect(data.name).toBe("New Skill");
  });
});

describe("DELETE /api/campaigns/[id]/skills (delete all)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { DELETE } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 200 та deletedCount при успіху", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });
    vi.mocked(prisma.skill.deleteMany).mockResolvedValue({ count: 5 });

    const { DELETE } = await import("@/app/api/campaigns/[id]/skills/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { success: boolean; deletedCount: number };

    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(5);
  });
});

describe("GET /api/campaigns/[id]/skills/[skillId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо немає доступу до кампанії", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 404, якщо скіл не знайдено або з іншої кампанії", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);

    const data = await getResponseJson<{ error: string }>(response);

    expect(data.error).toBe("Skill not found");
  });

  it("повертає 404, якщо скіл належить іншій кампанії", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "skill-1",
      campaignId: "other-campaign",
      name: "Skill",
      description: null,
      icon: null,
      basicInfo: {},
      combatStats: null,
      bonuses: {},
      spellData: null,
      spellEnhancementData: null,
      mainSkillData: null,
      skillTriggers: [],
      image: null,
      damage: null,
      armor: null,
      speed: null,
      physicalResistance: null,
      magicalResistance: null,
      spellId: null,
      spellGroupId: null,
      mainSkillId: null,
      spellEnhancementTypes: [],
      spellEffectIncrease: null,
      spellTargetChange: null,
      spellAdditionalModifier: null,
      spellNewSpellId: null,
      grantedSpellId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      spell: null,
      spellGroup: null,
      grantedSpell: null,
    } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);
  });

  it("повертає 200 та скіл при успіху", async () => {
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
      userId: "user-1",
      authUser: { id: "user-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "user-1", role: "player" }],
      },
    });

    const mockSkill = {
      id: "skill-1",
      campaignId: "c1",
      name: "Fireball",
      description: null,
      icon: null,
      basicInfo: { name: "Fireball" },
      combatStats: null,
      bonuses: {},
      spellData: null,
      spellEnhancementData: null,
      mainSkillData: null,
      skillTriggers: [],
      image: null,
      damage: null,
      armor: null,
      speed: null,
      physicalResistance: null,
      magicalResistance: null,
      spellId: null,
      spellGroupId: null,
      mainSkillId: null,
      spellEnhancementTypes: [],
      spellEffectIncrease: null,
      spellTargetChange: null,
      spellAdditionalModifier: null,
      spellNewSpellId: null,
      grantedSpellId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      spell: null,
      spellGroup: null,
      grantedSpell: null,
    };

    vi.mocked(prisma.skill.findUnique).mockResolvedValue(mockSkill as never);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1");

    const response = await GET(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { id: string; basicInfo: { name: string } };

    expect(data.id).toBe("skill-1");
    expect(data.basicInfo.name).toBe("Fireball");
  });
});

describe("PATCH /api/campaigns/[id]/skills/[skillId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "PATCH",
      body: JSON.stringify({ basicInfo: { name: "Updated" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 404, якщо скіл не знайдено", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    vi.mocked(apiAuth.validateCampaignOwnership).mockReturnValue(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "PATCH",
      body: JSON.stringify({ basicInfo: { name: "Updated" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);
  });

  it("повертає 200 та оновлений скіл при успіху", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });

    const existingSkill = {
      id: "skill-1",
      campaignId: "c1",
      name: "Old Name",
      description: null,
      icon: null,
      basicInfo: {},
      combatStats: null,
      bonuses: {},
      spellData: null,
      spellEnhancementData: null,
      mainSkillData: null,
      skillTriggers: [],
      image: null,
      damage: null,
      armor: null,
      speed: null,
      physicalResistance: null,
      magicalResistance: null,
      spellId: null,
      spellGroupId: null,
      mainSkillId: null,
      spellEnhancementTypes: [],
      spellEffectIncrease: null,
      spellTargetChange: null,
      spellAdditionalModifier: null,
      spellNewSpellId: null,
      grantedSpellId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.skill.findUnique).mockResolvedValue(existingSkill as never);
    vi.mocked(apiAuth.validateCampaignOwnership).mockReturnValue(null);

    const updatedSkill = {
      ...existingSkill,
      name: "Updated Name",
      basicInfo: { name: "Updated Name" },
    };

    vi.mocked(prisma.skill.update).mockResolvedValue({
      ...updatedSkill,
      spell: null,
      spellGroup: null,
      grantedSpell: null,
      mainSkill: null,
    } as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "PATCH",
      body: JSON.stringify({ basicInfo: { name: "Updated Name" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { id: string; basicInfo: { name: string } };

    expect(data.id).toBe("skill-1");
    expect(data.basicInfo.name).toBe("Updated Name");
  });
});

describe("DELETE /api/campaigns/[id]/skills/[skillId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("повертає 403, якщо користувач не DM", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const { DELETE } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(403);
  });

  it("повертає 404, якщо скіл не знайдено", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });
    vi.mocked(prisma.skill.findUnique).mockResolvedValue(null);
    vi.mocked(apiAuth.validateCampaignOwnership).mockReturnValue(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );

    const { DELETE } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(404);
  });

  it("повертає 200 при успішному видаленні", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue({
      userId: "dm-1",
      authUser: { id: "dm-1", email: null, user_metadata: null },
      campaign: {
        id: "c1",
        maxLevel: 20,
        xpMultiplier: 2.5,
        members: [{ userId: "dm-1", role: "dm" }],
      },
    });
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "skill-1",
      campaignId: "c1",
    } as never);
    vi.mocked(apiAuth.validateCampaignOwnership).mockReturnValue(null);
    vi.mocked(prisma.skill.delete).mockResolvedValue({} as never);

    const { DELETE } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const request = createRequest("http://localhost/api/campaigns/c1/skills/skill-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "c1", skillId: "skill-1" }),
    });

    expect(await getResponseStatus(response)).toBe(200);

    const data = await getResponseJson(response) as { success: boolean };

    expect(data.success).toBe(true);
  });
});
