import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; campaignId: string; status: string; controlledBy: string | null; level: number; constitution: number; archetype: string | null; resources: Record<string, unknown>; experience: number; characteristics: Record<string, unknown> };

const h = vi.hoisted(() => {
  const state = { rows: new Map<string, Record<string, unknown>>(), invs: new Map<string, Record<string, unknown>>(), inBattle: false, careers: [] as Record<string, unknown>[] };

  return {
    state,
    character: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    characterInventory: { upsert: vi.fn(), update: vi.fn() },
    characterLog: { createMany: vi.fn() },
    inventoryLog: { createMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn() },
    career: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => Promise<unknown>) => fn(h) } }));
vi.mock("@/lib/server/notifications/notify", () => ({ notifyCharacterOwners: vi.fn() }));

import { runCharacterOperation } from "../operation-runner";
import { advanceOperation } from "../operations/advance";
import { corruptionGrantOperation } from "../operations/corruption";
import { corruptionUndoOperation } from "../operations/corruption-undo";
import { downtimeSetOperation } from "../operations/downtime";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { corruptionGrantSchema, corruptionUndoSchema } from "@/lib/schemas/corruption";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { type Characteristics, DEFAULT_CHARACTERISTICS, preserveServerOwned, readCharacteristics, ruleSystemOf } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { CorruptionGrantResult, CorruptionUndoResult } from "@/types/corruption";

const hero = (id: string, over: Partial<Row> = {}, characteristics: Partial<Characteristics> = {}): Row => ({
  id,
  campaignId: "camp",
  status: "active",
  controlledBy: `owner-${id}`,
  level: 1,
  constitution: 10,
  archetype: null,
  resources: {},
  experience: 0,
  characteristics: { ...DEFAULT_CHARACTERISTICS, skillAdvances: { charm: 1, research: 1, heal: 1 }, ...characteristics },
  ...over,
});

const put = (row: Row) => h.state.rows.set(row.id, row);

const stored = (id: string) => h.state.rows.get(id) as unknown as Row;

const chars = (id: string) => readCharacteristics({ characteristics: stored(id).characteristics });

const dm = (rules = WFRP_RULES) => ({ userId: "dm", isDM: true, campaign: { id: "camp", rules } });

const player = (userId: string, rules = WFRP_RULES) => ({ userId, isDM: false, campaign: { id: "camp", rules } });

const grant = (input: unknown, access = dm(), characterId = "h1") => runCharacterOperation(corruptionGrantOperation, { campaignId: "camp", characterId, access: access as never }, input as never) as Promise<CorruptionGrantResult>;

const undo = (input: unknown, access = dm(), characterId = "h1") => runCharacterOperation(corruptionUndoOperation, { campaignId: "camp", characterId, access: access as never }, input as never) as Promise<CorruptionUndoResult>;

const noWrites = () => {
  expect(h.character.update).not.toHaveBeenCalled();
  expect(h.characterLog.createMany).not.toHaveBeenCalled();
};

const pct = (n: number) => (n - 1) / 100 + 0.005;

const rolls = (test: number, type: number, row: number) => {
  for (const n of [test, type, row]) vi.mocked(Math.random).mockReturnValueOnce(pct(n));
};

const sys = (rules = WFRP_RULES) => ruleSystemOf(rules);

const logged = () => h.characterLog.createMany.mock.calls.map((c) => (c[0] as { data: { kind: string; data: Record<string, unknown> }[] }).data[0]);

beforeEach(() => {
  vi.clearAllMocks();
  h.state.rows.clear();
  h.state.invs.clear();
  h.state.inBattle = false;
  h.state.careers = [];
  vi.spyOn(Math, "random").mockReturnValue(0.01);

  const owned = (where: { id: string | { in: string[] }; campaignId?: string; status?: string }) => {
    const ids = typeof where.id === "string" ? [where.id] : where.id.in;

    return ids.map((id) => h.state.rows.get(id) as unknown as Row | undefined).filter((r): r is Row => !!r && (!where.campaignId || r.campaignId === where.campaignId) && (!where.status || r.status === where.status));
  };

  h.character.findMany.mockImplementation(async ({ where }: { where: Parameters<typeof owned>[0] }) => owned(where));
  h.character.count.mockImplementation(async ({ where }: { where: Parameters<typeof owned>[0] }) => owned(where).length);
  h.character.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => h.state.rows.get(where.id) ?? null);
  h.character.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const row = h.state.rows.get(where.id);

    if (row) Object.assign(row, data);
  });
  h.$queryRaw.mockImplementation(async (_strings: unknown, join: { values: string[] }) => join.values.flatMap((id) => (h.state.rows.has(id) ? [{ ...h.state.rows.get(id) }] : [])));
  h.$executeRaw.mockResolvedValue(0);
  h.characterInventory.upsert.mockImplementation(async ({ where }: { where: { characterId: string } }) => {
    if (!h.state.invs.has(where.characterId)) h.state.invs.set(where.characterId, { characterId: where.characterId, equipped: {}, backpack: [], items: [], stash: [], attuned: [], gold: 0, silver: 0, copper: 0 });

    return h.state.invs.get(where.characterId);
  });
  h.characterInventory.update.mockImplementation(async ({ where, data }: { where: { characterId: string }; data: Record<string, unknown> }) => Object.assign(h.state.invs.get(where.characterId) ?? {}, data));
  h.characterLog.createMany.mockResolvedValue(undefined);
  h.inventoryLog.createMany.mockResolvedValue({ count: 1 });
  h.battleParticipant.findFirst.mockImplementation(async () => (h.state.inBattle ? { id: "bp" } : null));
  h.career.findMany.mockImplementation(async () => h.state.careers);
});

afterEach(() => vi.restoreAllMocks());


const sheet = (id: string) => sys().characteristics.sheetBlock({ characteristics: chars(id), resources: {} });

const maxTotal = (id: string) => sys().progression.maxHp({ character: { level: 1, constitution: 10 } as never, characteristics: chars(id), rules: WFRP_RULES })?.total;

const stats = (id: string) => ({ speed: sys().combat.baseStats?.(stored(id)).speed, fields: sys().combat.participantFields?.(stored(id)) });

describe("corruption.grant and corruption.undo", () => {
  it("grants below the threshold, then mutates on a failed test, and undoes the last grant", async () => {
    put(hero("h1"));

    const first = await grant({ points: 5, reason: "Warpstone" });

    expect(first.summary.test).toBeUndefined();
    expect(first.corruption.points).toBe(5);
    expect(logged()[0]).toMatchObject({ kind: CharacterLogKind.CORRUPTION, data: { grantId: first.grantId, reason: "Warpstone", mutation: false } });

    const speed0 = stats("h1").speed;

    const maxHp0 = maxTotal("h1");

    rolls(96, 20, 34);

    const second = await grant({ points: 2, reason: "Rift" });

    expect(second.summary.mutation?.kind).toBe("physical");
    expect(second.summary.mutation?.effects).toEqual([{ type: "move", amount: -1 }]);
    expect(chars("h1").corruption?.mutations[0]?.id).toBe(second.grantId);
    expect(stats("h1").speed).toBeLessThan(speed0 as number);
    expect(sheet("h1")?.move.value).toBe(3);

    const agBefore = sheet("h1")?.characteristics.find((c) => c.key === "ag")?.value as number;

    rolls(96, 20, 1);

    await grant({ points: 1, reason: "Rift" });

    expect(stats("h1").fields?.characteristics.corruption).toBeUndefined();
    expect(sheet("h1")?.characteristics.find((c) => c.key === "ag")?.value).toBe(agBefore - 5);

    rolls(96, 20, 71);

    const last = await grant({ points: 1, reason: "Rift" });

    expect(maxTotal("h1")).toBe((maxHp0 as number) + 2);

    const undone = await undo({ grantId: last.grantId });

    expect(undone.corruption.mutations).toHaveLength(2);
    expect(maxTotal("h1")).toBe(maxHp0);
    expect(logged().at(-1)).toMatchObject({ kind: CharacterLogKind.CORRUPTION, data: { grantId: last.grantId, undo: true } });
  });

  it("tests only above the threshold and re-reads it after a mutation", async () => {
    put(hero("h1"));

    expect((await grant({ points: 6, reason: "x" })).summary.test).toBeUndefined();

    rolls(96, 20, 1);

    expect((await grant({ points: 1, reason: "x" })).summary.test).toBeDefined();

    const tables = { ...WFRP_RULES.tables, mutationPhysical: [{ max: 100, text: "custom", effects: [{ type: "characteristic", key: "t", amount: -10 }] }] };

    const rules = { ...WFRP_RULES, tables } as typeof WFRP_RULES;

    put(hero("h2"));

    await grant({ points: 6, reason: "x" }, dm(rules), "h2");

    rolls(96, 20, 1);

    const res = await grant({ points: 1, reason: "x" }, dm(rules), "h2");

    expect(res.summary.mutation?.text).toBe("custom");

    vi.mocked(Math.random).mockReturnValueOnce(pct(1));

    expect((await grant({ points: 1, reason: "x" }, dm(rules), "h2")).summary.threshold).toBe(5);
  });

  it("rejects a stale undo and leaves the sheet untouched", async () => {
    put(hero("h1"));

    const a = await grant({ points: 1, reason: "a" });

    const b = await grant({ points: 1, reason: "b" });

    vi.clearAllMocks();

    await expect(undo({ grantId: a.grantId })).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_STALE, status: 409 });
    noWrites();

    await undo({ grantId: b.grantId });

    h.character.update.mockClear();

    await expect(undo({ grantId: b.grantId })).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_STALE, status: 409 });

    const c = await grant({ points: 1, reason: "c" });

    put({ ...stored("h1"), characteristics: { ...stored("h1").characteristics, corruption: { ...chars("h1").corruption, points: 99 } } });

    vi.clearAllMocks();

    await expect(undo({ grantId: c.grantId })).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_STALE, status: 409 });
    noWrites();
  });

  it("survives a DM sheet save between grant and undo", async () => {
    put(hero("h1"));

    const g = await grant({ points: 3, reason: "a" });

    const incoming = { ...chars("h1"), corruption: { points: 0, mutations: [] } };

    put({ ...stored("h1"), characteristics: preserveServerOwned(chars("h1"), incoming) as never });

    expect(chars("h1").corruption?.points).toBe(3);

    await expect(undo({ grantId: g.grantId })).resolves.toMatchObject({ corruption: { points: 0 } });
  });

  it("keeps corruption through advance and downtime.set", async () => {
    put(hero("h1", { experience: 1000 }));

    rolls(96, 20, 34);

    await grant({ points: 10, reason: "x" });

    const before = chars("h1").corruption;

    expect(before?.mutations).toHaveLength(1);

    await runCharacterOperation(advanceOperation, { campaignId: "camp", characterId: "h1", access: dm() as never }, { kind: "characteristic", key: "ws" } as never);

    expect(chars("h1").corruption).toEqual(before);

    await runCharacterOperation(downtimeSetOperation, { campaignId: "camp", characterId: "h1", access: dm() as never }, { endeavour: { kind: "earn", params: { skill: "charm" } } } as never);

    expect(chars("h1").corruption).toEqual(before);
  });

  it("is DM-only, wfrp-only, out of battle and for active heroes", async () => {
    put(hero("h1"));
    put(hero("h3", { status: "dead" }));

    for (const who of [player("owner-h1"), player("stranger")]) {
      await expect(grant({ points: 1, reason: "x" }, who)).rejects.toMatchObject({ status: 403 });
      await expect(undo({ grantId: "g" }, who)).rejects.toMatchObject({ status: 403 });
    }

    for (const rules of [DEFAULT_RULES, { ...DEFAULT_RULES, system: { key: "dnd5e" } }]) {
      await expect(grant({ points: 1, reason: "x" }, dm(rules as never))).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_UNSUPPORTED, status: 409 });
      await expect(undo({ grantId: "g" }, dm(rules as never))).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_UNSUPPORTED, status: 409 });
    }

    await expect(grant({ points: 1, reason: "x" }, dm(), "h3")).rejects.toMatchObject({ message: API_ERRORS.REST_CHARACTERS_INVALID, status: 400 });

    h.state.inBattle = true;

    await expect(grant({ points: 1, reason: "x" })).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_IN_BATTLE, status: 409 });
    await expect(undo({ grantId: "g" })).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_IN_BATTLE, status: 409 });
    noWrites();
  });

  it("schemas reject malformed bodies", () => {
    for (const body of [{ points: 0, reason: "x" }, { points: 11, reason: "x" }, { points: 1.5, reason: "x" }, { points: 1, reason: "" }, { points: 1, reason: "   " }, { points: 1, reason: "a".repeat(81) }]) {
      expect(corruptionGrantSchema.safeParse(body).success).toBe(false);
    }

    expect(corruptionGrantSchema.safeParse({ points: 10, reason: " ok " }).success).toBe(true);
    expect(corruptionUndoSchema.safeParse({ grantId: "" }).success).toBe(false);
  });
});
