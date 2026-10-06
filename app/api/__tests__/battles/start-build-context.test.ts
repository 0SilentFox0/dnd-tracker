import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { findMany: vi.fn() },
  campaign: { findUnique: vi.fn(async () => ({ maxLevel: 20 })) },
  skillTree: { findMany: vi.fn(async () => []) },
  mainSkill: { findMany: vi.fn(async () => []) },
  spell: { findMany: vi.fn(async () => []) },
  skill: { findMany: vi.fn(async () => []) },
  artifact: { findMany: vi.fn(async () => []) },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { buildCampaignContextForStart } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-build-context";

describe("buildCampaignContextForStart", () => {
  beforeEach(() => db.race.findMany.mockReset());

  it("раси юнітів — за raceId (відсутні → null), юніти без раси не запитуються", async () => {
    db.race.findMany.mockResolvedValue([{ id: "r-orc", name: "Орк" }]);

    const { racesById } = await buildCampaignContextForStart("c1", [], [
      { id: "u1", raceId: "r-orc" },
      { id: "u2", raceId: "gone" },
      { id: "u3", raceId: null },
    ]);

    expect(db.race.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1", OR: [{ id: { in: ["r-orc", "gone"] } }] } });
    expect(racesById).toEqual({ "r-orc": { id: "r-orc", name: "Орк" }, gone: null });
  });

  it("без рас — без запиту до races", async () => {
    const { racesById } = await buildCampaignContextForStart("c1", [], [{ id: "u3", raceId: null }]);

    expect(db.race.findMany).not.toHaveBeenCalled();
    expect(racesById).toEqual({});
  });

  it("старт бою з героями читає вузький контекст: спели без описів, скіли лише за id героїв", async () => {
    db.race.findMany.mockResolvedValue([]);

    const hero = { id: "h", campaignId: "c1", race: "Ельф", skillTreeProgress: {}, personalSkillId: "p1", inventory: null } as never;

    await buildCampaignContextForStart("c1", [hero], []);

    expect(db.spell.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1" }, select: { id: true, level: true, spellGroup: { select: { id: true } } } });
    expect(db.skill.findMany).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["p1"] } } });
  });
});
