import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  spell: { count: vi.fn() },
  spellGroup: { count: vi.fn() },
  mainSkill: { count: vi.fn() },
  artifactSet: { count: vi.fn() },
  race: { count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { assertCampaignRefs, foreignCampaignRef } from "@/lib/server/campaigns/campaign-refs";

describe("campaign refs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach((m) => m.count.mockResolvedValue(1));
  });

  it("порожні посилання — без запитів", async () => {
    expect(await foreignCampaignRef("c1", { spell: [null, undefined, ""], artifactSet: undefined })).toBeNull();
    expect(db.spell.count).not.toHaveBeenCalled();
    expect(db.artifactSet.count).not.toHaveBeenCalled();
  });

  it("свої посилання — null; дублікати рахуються раз", async () => {
    expect(await foreignCampaignRef("c1", { spell: ["s1", "s1"], mainSkill: "m1" })).toBeNull();
    expect(db.spell.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["s1"] } } });
    expect(db.mainSkill.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["m1"] } } });
  });

  it("чуже заклинання — 400 з українським текстом", async () => {
    db.spell.count.mockResolvedValue(1);

    await expect(assertCampaignRefs("c1", { spell: ["s1", "s2"], spellGroup: "g1" })).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_SPELL, status: 400 });
  });

  it("чужий сет артефактів — 400", async () => {
    db.artifactSet.count.mockResolvedValue(0);

    expect(await foreignCampaignRef("c1", { artifactSet: "set-x" })).toBe(API_ERRORS.FOREIGN_ARTIFACT_SET);
  });

  it("чужа раса — 400", async () => {
    db.race.count.mockResolvedValue(0);

    await expect(assertCampaignRefs("c1", { race: "r-x" })).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_RACE, status: 400 });
  });
});
