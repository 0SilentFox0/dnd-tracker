import { beforeEach, describe, expect, it, vi } from "vitest";

import { contentPreviewState } from "@/lib/server/assistant/actions/content-preview";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => {
  const delegate = () => ({ findMany: vi.fn(async (_args?: unknown) => [] as Array<{ id: string }>) });

  return {
    $queryRaw: vi.fn(async () => [] as Array<{ id: string }>),
    spell: delegate(), spellGroup: delegate(), race: delegate(), gameClass: delegate(), feat: delegate(), background: delegate(), unit: delegate(),
    mainSkill: delegate(), skill: delegate(), skillTree: delegate(), artifactSet: delegate(), artifact: delegate(), campaignTrack: delegate(),
    character: delegate(), characterInventory: delegate(), characterSkills: delegate(),
  };
});

vi.mock("@/lib/db", () => ({ prisma: db }));

const actor = { campaignId: "camp" } as never;

const patternLength = (call: unknown[]) => String((call[0] as { values: unknown[] }).values.at(-1)).split("|").length;

beforeEach(() => vi.clearAllMocks());

describe("contentPreviewState", () => {
  it("loads the own table directly and chunks the id prefilter of the others", async () => {
    const own = Array.from({ length: 3500 }, (_, i) => ({ id: `spell-${i}` }));

    db.spell.findMany.mockResolvedValue(own);

    const state = await contentPreviewState(actor, "spells", undefined, {});

    expect(state.tables.spells).toHaveLength(3500);

    const calls = db.$queryRaw.mock.calls;

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(call => patternLength(call) <= 500)).toBe(true);
    expect(calls.some(call => patternLength(call) === 500)).toBe(true);
    expect(calls.map(patternLength).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3500 * 3);
  });

  it("unions rows found by different chunks without duplicates", async () => {
    db.spell.findMany.mockResolvedValueOnce(Array.from({ length: 1200 }, (_, i) => ({ id: `s${i}` })));
    db.$queryRaw.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    await contentPreviewState(actor, "spells", undefined, {});

    const lookup = db.unit.findMany.mock.calls.at(-1)?.[0] as { where: { id: { in: string[] } } };

    expect(lookup.where.id.in).toEqual(["a", "b"]);
  });
});
