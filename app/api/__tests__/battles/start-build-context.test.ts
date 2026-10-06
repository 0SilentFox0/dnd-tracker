import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { findMany: vi.fn() },
  campaign: { findUnique: vi.fn(async () => ({ maxLevel: 20 })) },
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
});
