import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { character: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) }, career: { findMany: vi.fn(async () => []) }, scenarioPage: { findFirst: vi.fn(async () => null) } } }));
vi.mock("@/lib/server/campaigns/rules", () => ({ loadRules: vi.fn() }));

import { partySummary } from "@/lib/ai/tools/party";
import { loadRules } from "@/lib/server/campaigns/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

describe("partySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadRules).mockResolvedValue(parseRules({}));
  });

  it("лише активні гравці — чернетки не потрапляють в AI-контекст", async () => {
    await partySummary("camp");

    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "camp", type: "player", status: "active" } }));
  });

  it("d20: classic member shape, no characteristics, no career query", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "h1", name: "Godric", level: 5, class: "Knight", race: "Human", armorClass: 16, notes: null }] as never);

    const [member] = await partySummary("camp");

    expect(member).toEqual({ id: "h1", name: "Godric", level: 5, class: "Knight", race: "Human", armorClass: 16, notes: null });
    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.not.objectContaining({ characteristics: true }) }));
    expect(prisma.career.findMany).not.toHaveBeenCalled();
  });

  it("wfrp: select with characteristics, member has career and wounds, no armorClass", async () => {
    vi.mocked(loadRules).mockResolvedValue(parseRules(WFRP_RULES));
    vi.mocked(prisma.career.findMany).mockResolvedValue([{ id: "c1", name: "Archivist", tiers: [{ name: "Copyist" }] }] as never);
    vi.mocked(prisma.character.findMany).mockResolvedValue([{ id: "h1", name: "Hans", level: 1, race: "Human", notes: null, characteristics: { career: { careerId: "c1", tier: 1, ticks: [] } } }] as never);

    const [member] = await partySummary("camp");

    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ characteristics: true }) }));
    expect(member).toMatchObject({ id: "h1", career: { name: "Archivist", tier: 1, tierName: "Copyist" } });
    expect(member).toHaveProperty("woundsMax");
    expect(member).not.toHaveProperty("armorClass");
  });

  it("explicit rules skip loadRules", async () => {
    await partySummary("camp", undefined, parseRules({}));

    expect(loadRules).not.toHaveBeenCalled();
  });
});
