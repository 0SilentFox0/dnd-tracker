import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { profileReferences } from "@/lib/server/races/profile-usage";
import { listRaceProfiles, saveRaceProfile } from "@/lib/server/races/race-profile";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    race: { findUnique: vi.fn() },
    career: { count: vi.fn() },
    feat: { count: vi.fn() },
    raceProfile: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

const profile = (over: Partial<SpeciesProfile> = {}): SpeciesProfile => ({ mods: {}, move: 4, fate: 2, extraWounds: 0, talents: ["f1"], randomTalentCount: 1, randomTalents: [{ max: 100, featId: "f2" }], careerTable: [{ max: 100, careerId: "c1" }], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.race.findUnique).mockResolvedValue({ campaignId: "camp" } as never);
  vi.mocked(prisma.career.count).mockResolvedValue(1);
  vi.mocked(prisma.feat.count).mockResolvedValue(2);
});

describe("saveRaceProfile", () => {
  it("upserts and returns the item", async () => {
    const p = profile();

    expect(await saveRaceProfile("camp", "r1", p)).toEqual({ raceId: "r1", profile: p });
    expect(prisma.raceProfile.upsert).toHaveBeenCalledWith({ where: { raceId: "r1" }, create: { raceId: "r1", campaignId: "camp", profile: p }, update: { profile: p } });
  });

  it("404 for a missing race, 403 for another campaign's race", async () => {
    vi.mocked(prisma.race.findUnique).mockResolvedValueOnce(null);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 404 });

    vi.mocked(prisma.race.findUnique).mockResolvedValueOnce({ campaignId: "other" } as never);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 403 });
    expect(prisma.raceProfile.upsert).not.toHaveBeenCalled();
  });

  it("rejects a foreign career and a foreign feat", async () => {
    vi.mocked(prisma.career.count).mockResolvedValue(0);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 400, message: "errors.foreignCareer" });

    vi.mocked(prisma.career.count).mockResolvedValue(1);
    vi.mocked(prisma.feat.count).mockResolvedValue(1);
    await expect(saveRaceProfile("camp", "r1", profile())).rejects.toMatchObject({ status: 400, message: "errors.foreignFeat" });
    expect(prisma.raceProfile.upsert).not.toHaveBeenCalled();
  });
});

describe("listRaceProfiles", () => {
  it("scopes to the campaign and skips invalid rows", async () => {
    vi.mocked(prisma.raceProfile.findMany).mockResolvedValue([{ raceId: "a", profile: profile() }, { raceId: "b", profile: { move: 99 } }] as never);

    expect((await listRaceProfiles("camp")).map((i) => i.raceId)).toEqual(["a"]);
    expect(prisma.raceProfile.findMany).toHaveBeenCalledWith({ where: { campaignId: "camp" }, select: { raceId: true, profile: true } });
  });
});

describe("profileReferences", () => {
  beforeEach(() => vi.mocked(prisma.raceProfile.findMany).mockResolvedValue([{ profile: profile() }] as never));

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
