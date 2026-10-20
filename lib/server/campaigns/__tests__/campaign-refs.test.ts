import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  spell: { count: vi.fn() },
  spellGroup: { count: vi.fn() },
  mainSkill: { count: vi.fn() },
  artifactSet: { count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { invalidCampaignRefs } from "@/lib/server/campaigns/campaign-refs";

describe("invalidCampaignRefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach((m) => m.count.mockResolvedValue(1));
  });

  it("порожні посилання — без запитів", async () => {
    expect(await invalidCampaignRefs("c1", { spell: [null, undefined, ""], artifactSet: undefined })).toBeNull();
    expect(db.spell.count).not.toHaveBeenCalled();
    expect(db.artifactSet.count).not.toHaveBeenCalled();
  });

  it("свої посилання — null; дублікати рахуються раз", async () => {
    expect(await invalidCampaignRefs("c1", { spell: ["s1", "s1"], mainSkill: "m1" })).toBeNull();
    expect(db.spell.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["s1"] } } });
    expect(db.mainSkill.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["m1"] } } });
  });

  it("чуже заклинання — 400 з українським текстом", async () => {
    db.spell.count.mockResolvedValue(1);

    const res = await invalidCampaignRefs("c1", { spell: ["s1", "s2"], spellGroup: "g1" });

    expect(res?.status).toBe(400);
    expect(await res?.json()).toEqual({ error: API_ERRORS.FOREIGN_SPELL });
  });

  it("чужий сет артефактів — 400", async () => {
    db.artifactSet.count.mockResolvedValue(0);

    const res = await invalidCampaignRefs("c1", { artifactSet: "set-x" });

    expect(await res?.json()).toEqual({ error: API_ERRORS.FOREIGN_ARTIFACT_SET });
  });
});
