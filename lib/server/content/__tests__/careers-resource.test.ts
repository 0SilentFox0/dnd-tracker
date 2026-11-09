import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  career: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  character: { count: vi.fn() },
  feat: { count: vi.fn() },
  race: { findMany: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedCareers: vi.fn(async () => [{ id: "k", campaignId: "c", name: "Soldier", icon: null, class: null, tiers: [] }]) }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { careersResource } from "@/lib/server/content/resources/careers";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null };

const tier = (talents: string[] = []) => ({ name: "T", characteristics: ["ws" as const], skills: ["athletics"], talents, trappings: [] });

const tiers = (talents: string[] = []) => [tier(talents), tier(), tier(), tier()];

describe("careersResource", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.career.findFirst.mockResolvedValue(null);
    db.feat.count.mockResolvedValue(0);
    db.character.count.mockResolvedValue(0);
    db.race.findMany.mockResolvedValue([]);
  });

  it("lists and finds through the service", async () => {
    expect(await careersResource.list(actor, new URLSearchParams())).toEqual([expect.objectContaining({ id: "k", name: "Soldier" })]);
    await careersResource.find(actor, "k", "read");
    expect(db.career.findFirst).toHaveBeenCalledWith({ where: { id: "k", campaignId: "c" } });
  });

  it("creates with tiers stored as json", async () => {
    db.feat.count.mockResolvedValue(1);
    await careersResource.create(actor, { name: "Soldier", tiers: tiers(["f1"]) });

    expect(db.career.create).toHaveBeenCalledWith({ data: expect.objectContaining({ campaignId: "c", name: "Soldier" }) });
  });

  it("taken name -> 409", async () => {
    db.career.findFirst.mockResolvedValue({ id: "x" });

    await expect(careersResource.create(actor, { name: "Soldier", tiers: tiers() })).rejects.toMatchObject({ message: API_ERRORS.CAREER_NAME_TAKEN, status: 409 });
    expect(db.career.create).not.toHaveBeenCalled();
  });

  it("rejects a talent feat from another campaign", async () => {
    db.feat.count.mockResolvedValue(0);

    await expect(careersResource.create(actor, { name: "S", tiers: tiers(["foreign"]) })).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_FEAT, status: 400 });
    await expect(careersResource.update(actor, { id: "k" } as never, { tiers: tiers(["foreign"]) })).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_FEAT });
    expect(db.career.create).not.toHaveBeenCalled();
    expect(db.career.update).not.toHaveBeenCalled();
  });

  it("updates without tiers skips the ref check", async () => {
    await careersResource.update(actor, { id: "k" } as never, { icon: "https://x/y.png" });

    expect(db.feat.count).not.toHaveBeenCalled();
    expect(db.career.update).toHaveBeenCalledWith({ where: { id: "k" }, data: { icon: "https://x/y.png" } });
  });

  it("remove with characters on the career -> 409 CAREER_IN_USE", async () => {
    db.character.count.mockResolvedValue(1);

    await expect(careersResource.remove(actor, { id: "k" } as never)).rejects.toMatchObject({ message: API_ERRORS.CAREER_IN_USE, status: 409 });
    expect(db.character.count).toHaveBeenCalledWith({ where: { campaignId: "c", characteristics: { path: ["career", "careerId"], equals: "k" } } });
    expect(db.career.deleteMany).not.toHaveBeenCalled();
  });

  it("remove unused deletes", async () => {
    await careersResource.remove(actor, { id: "k" } as never);

    expect(db.career.deleteMany).toHaveBeenCalledWith({ where: { id: "k", campaignId: "c" } });
  });

  it("remove while a species table lists it -> 409 CAREER_IN_SPECIES_TABLE (after CAREER_IN_USE)", async () => {
    db.race.findMany.mockResolvedValue([{ id: "r", profile: { careerTable: [{ max: 100, careerId: "k" }] } }]);

    await expect(careersResource.remove(actor, { id: "k" } as never)).rejects.toMatchObject({ message: API_ERRORS.CAREER_IN_SPECIES_TABLE, status: 409 });
    expect(db.career.deleteMany).not.toHaveBeenCalled();

    db.character.count.mockResolvedValue(1);
    await expect(careersResource.remove(actor, { id: "k" } as never)).rejects.toMatchObject({ message: API_ERRORS.CAREER_IN_USE });
  });
});
