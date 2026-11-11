import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = { row: null as { id: string; resources: unknown; experience: number; characteristics: unknown } | null, careers: new Map<string, Record<string, unknown>>() };

  return {
    state,
    character: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    feat: { findFirst: vi.fn(), count: vi.fn() },
    career: { findFirst: vi.fn(), create: vi.fn() },
    characterLog: { createMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => Promise<unknown>) => fn(h) } }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedCareers: vi.fn(async () => []) }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { careersResource } from "@/lib/server/content/resources/careers";
import type { Actor } from "@/lib/utils/api/actor";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import { advanceOperation } from "@/systems/wfrp/server/operations/advance";
import { advanceUndoOperation } from "@/systems/wfrp/server/operations/advance-undo";
import { careerAdvanceOperation, careerSetOperation } from "@/systems/wfrp/server/operations/career";

type Chars = typeof DEFAULT_CHARACTERISTICS;

type Run = (gate: unknown, input: unknown) => Promise<{ characteristics: Chars; available?: number; entry?: { cost: number; tick?: string } }>;

const advance = advanceOperation.run as unknown as Run;

const undo = advanceUndoOperation.run as unknown as Run;

const setCareer = careerSetOperation.run as unknown as Run;

const advanceCareer = careerAdvanceOperation.run as unknown as Run;

const dm: Actor = { campaignId: "camp", userId: "dm", isDM: true, via: "session", scopes: null };

const character = { id: "hero", campaignId: "camp", controlledBy: "p1", status: "active" };

const gateOf = (rules = WFRP_RULES) => ({ access: { userId: "dm", isDM: true, campaign: { id: "camp", rules } }, character });

const tier = (over: object = {}) => ({ name: "T", characteristics: ["ws", "bs", "s", "t"] as ("ws" | "bs" | "s" | "t")[], skills: ["a", "b", "c", "d", "e", "f"], talents: [], trappings: [], ...over });

const stored = () => h.state.row?.characteristics as Chars;

beforeEach(() => {
  vi.clearAllMocks();
  h.state.careers.clear();
  h.state.row = { id: "hero", resources: {}, experience: 1000, characteristics: DEFAULT_CHARACTERISTICS };
  h.$queryRaw.mockImplementation(async () => (h.state.row ? [{ ...h.state.row }] : []));
  h.character.update.mockImplementation(async ({ data }: { data: { characteristics: unknown } }) => { if (h.state.row) h.state.row.characteristics = data.characteristics; });
  h.characterLog.createMany.mockResolvedValue(undefined);
  h.feat.findFirst.mockResolvedValue(null);
  h.feat.count.mockResolvedValue(0);
  h.character.count.mockResolvedValue(0);
  h.career.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    const row = { id: "c1", ...data };

    h.state.careers.set("c1", row);

    return row;
  });
  h.career.findFirst.mockImplementation(async ({ where }: { where: { id?: string } }) => (where.id ? h.state.careers.get(where.id) ?? null : null));
});

describe("wfrp careers end to end", () => {
  it("DM creates, assigns, buys in/out of career, reaches the threshold, advances; undo reverts the last purchase", async () => {
    await careersResource.create(dm, { name: "Soldier", tiers: [tier(), tier({ name: "T2" }), tier({ name: "T3" }), tier({ name: "T4" })] });

    expect(h.state.careers.get("c1")).toMatchObject({ campaignId: "camp", name: "Soldier" });

    const assigned = await setCareer(gateOf(), { careerId: "c1" });

    expect(assigned.characteristics.career).toEqual({ careerId: "c1", tier: 1, ticks: [] });

    const inCareer = await advance(gateOf(), { kind: "characteristic", key: "ws" });

    expect(inCareer.entry).toMatchObject({ cost: 25, tick: "characteristic:ws" });
    expect(stored().career?.ticks).toEqual(["characteristic:ws"]);

    const outOfCareer = await advance(gateOf(), { kind: "characteristic", key: "dex" });

    expect(outOfCareer.entry?.cost).toBe(50);
    expect(outOfCareer.entry?.tick).toBeUndefined();
    expect(stored().career?.ticks).toEqual(["characteristic:ws"]);

    await expect(advanceCareer(gateOf(), {})).rejects.toMatchObject({ message: API_ERRORS.CAREER_TICKS_MISSING, status: 409, issues: { needed: 10, have: 1 } });

    for (const key of ["bs", "s", "t"]) await advance(gateOf(), { kind: "characteristic", key });

    for (const key of ["a", "b", "c", "d", "e", "f"]) await advance(gateOf(), { kind: "skill", key });

    expect(stored().career?.ticks).toHaveLength(10);

    const advanced = await advanceCareer(gateOf(), {});

    expect(advanced.characteristics.career).toEqual({ careerId: "c1", tier: 2, ticks: [] });

    const before = stored().ledger.length;

    const last = await undo(gateOf(), {});

    expect(last.characteristics.ledger).toHaveLength(before - 1);
    expect(last.characteristics.skillAdvances.f).toBeUndefined();
  });

  it("undoing an in-career purchase removes its tick", async () => {
    await careersResource.create(dm, { name: "Soldier", tiers: [tier(), tier(), tier(), tier()] });
    await setCareer(gateOf(), { careerId: "c1" });
    await advance(gateOf(), { kind: "characteristic", key: "ws" });

    expect(stored().career?.ticks).toEqual(["characteristic:ws"]);

    const reverted = await undo(gateOf(), {});

    expect(reverted.characteristics.career?.ticks).toEqual([]);
    expect(reverted.characteristics.advances.ws ?? 0).toBe(0);
  });

  it("dnd5e and homm campaigns do not get the career or advancement operations", async () => {
    expect(ruleSystemOf(DEFAULT_RULES).advancement).toBeUndefined();

    for (const run of [setCareer, advanceCareer, advance, undo]) {
      await expect(run(gateOf(DEFAULT_RULES), { careerId: "c1", kind: "characteristic", key: "ws" })).rejects.toMatchObject({ message: API_ERRORS.ADVANCE_NOT_WFRP, status: 409 });
    }

    expect(h.character.update).not.toHaveBeenCalled();
  });
});
