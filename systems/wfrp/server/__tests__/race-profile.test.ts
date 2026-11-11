import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { profileReferences } from "@/lib/server/races/profile-usage";
import type { SpeciesProfile } from "@/systems/wfrp/rules/creation";
import { listRaceProfiles, saveRaceProfile } from "@/systems/wfrp/server/race-profile";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));
vi.mock("@/lib/server/content/write", () => ({ withCampaignContentWrite: vi.fn(async (_id: string, cb: () => unknown) => cb()) }));
vi.mock("@/lib/server/content/write-context", () => ({ afterContentCommit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    race: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    career: { count: vi.fn() },
    feat: { count: vi.fn() },
  },
}));

const profile = (over: Partial<SpeciesProfile> = {}): SpeciesProfile => ({ mods: {}, move: 4, fate: 2, extraWounds: 0, talents: ["f1"], randomTalentCount: 1, randomTalents: [{ max: 100, featId: "f2" }], careerTable: [{ max: 100, careerId: "c1" }], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.race.findFirst).mockResolvedValue({ id: "r1" } as never);
  vi.mocked(prisma.career.count).mockResolvedValue(1);
  vi.mocked(prisma.feat.count).mockResolvedValue(2);
});

describe("saveRaceProfile", () => {
  it("updates the race profile column and returns the item", async () => {
    const p = profile();

    expect(await saveRaceProfile("camp", "r1", p)).toEqual({ raceId: "r1", profile: p });
    expect(prisma.race.findFirst).toHaveBeenCalledWith({ where: { id: "r1", campaignId: "camp" }, select: { id: true } });
    expect(prisma.race.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { profile: p } });
  });

  it("404 for a race outside the campaign", async () => {
    vi.mocked(prisma.race.findFirst).mockResolvedValueOnce(null);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 404 });
    expect(prisma.race.update).not.toHaveBeenCalled();
  });

  it("rejects a foreign career and a foreign feat", async () => {
    vi.mocked(prisma.career.count).mockResolvedValue(0);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 400, message: "errors.foreignCareer" });

    vi.mocked(prisma.career.count).mockResolvedValue(1);
    vi.mocked(prisma.feat.count).mockResolvedValue(1);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 400, message: "errors.foreignFeat" });
    expect(prisma.race.update).not.toHaveBeenCalled();
  });
});

describe("listRaceProfiles", () => {
  it("scopes to the campaign and skips invalid rows", async () => {
    vi.mocked(prisma.race.findMany).mockResolvedValue([{ id: "a", profile: profile() }, { id: "b", profile: { move: 99 } }, { id: "c", profile: null }] as never);

    expect((await listRaceProfiles("camp")).map((i) => i.raceId)).toEqual(["a"]);
    expect(prisma.race.findMany).toHaveBeenCalledWith({ where: { campaignId: "camp" }, select: { id: true, profile: true } });
  });
});

describe("profileReferences", () => {
  beforeEach(() => vi.mocked(prisma.race.findMany).mockResolvedValue([{ id: "r1", profile: profile() }] as never));

  it("finds careers, talents and random talents", async () => {
    expect(await profileReferences("camp", { careerId: "c1" })).toBe(true);
    expect(await profileReferences("camp", { featId: "f1" })).toBe(true);
    expect(await profileReferences("camp", { featId: "f2" })).toBe(true);
  });

  it("false when nothing references the id", async () => {
    expect(await profileReferences("camp", { careerId: "zz" })).toBe(false);
    expect(await profileReferences("camp", { featId: "zz" })).toBe(false);
    expect(await profileReferences("camp", {})).toBe(false);
  });
});
