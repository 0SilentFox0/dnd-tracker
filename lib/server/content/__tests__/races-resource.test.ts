import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  race: { count: vi.fn(), create: vi.fn() },
  mainSkill: { count: vi.fn() },
  skill: { count: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedRaces: vi.fn(async () => []) }));
vi.mock("@/lib/server/races/race-name", () => ({ raceNameTaken: vi.fn(async () => false) }));

const cascade = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/races/update-race", () => ({ updateRaceCascade: cascade }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { racesResource } from "@/lib/server/content/resources/races";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session" };

describe("racesResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.count.mockResolvedValue(0);
    db.mainSkill.count.mockResolvedValue(1);
    db.skill.count.mockResolvedValue(1);
  });

  it("foreign availableSkills → 400 FOREIGN_MAIN_SKILL before create", async () => {
    db.mainSkill.count.mockResolvedValue(0);

    await expect(racesResource.create(actor, { name: "R", availableSkills: ["x"], disabledSkills: [] } as never)).rejects.toMatchObject({
      message: API_ERRORS.FOREIGN_MAIN_SKILL,
      status: 400,
    });
    expect(db.race.create).not.toHaveBeenCalled();
  });

  it("foreign disabledSkills → 400 FOREIGN_SKILL before create", async () => {
    db.skill.count.mockResolvedValue(0);

    await expect(racesResource.create(actor, { name: "R", availableSkills: [], disabledSkills: ["y"] } as never)).rejects.toMatchObject({
      message: API_ERRORS.FOREIGN_SKILL,
      status: 400,
    });
    expect(db.race.create).not.toHaveBeenCalled();
  });

  it("update checks only newly added skill ids", async () => {
    await racesResource.update(
      actor,
      { id: "r1", name: "R", availableSkills: ["gone"], disabledSkills: ["old"] } as never,
      { availableSkills: ["gone", "new"], disabledSkills: ["old"] } as never,
    );

    expect(db.mainSkill.count).toHaveBeenCalledWith({ where: { campaignId: "c1", id: { in: ["new"] } } });
    expect(db.skill.count).not.toHaveBeenCalled();
    expect(cascade).toHaveBeenCalled();
  });
});
