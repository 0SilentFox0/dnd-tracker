import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; campaignId: string; status: string; controlledBy: string | null; level: number; constitution: number; archetype: string | null; resources: Record<string, unknown>; experience: number; characteristics: Record<string, unknown> };

type Inv = { characterId: string; equipped: object; backpack: unknown[]; items: unknown[]; stash: unknown[]; attuned: unknown[]; gold: number; silver: number; copper: number };

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
import { advanceUndoOperation } from "../operations/advance-undo";
import { downtimeSetOperation } from "../operations/downtime";
import { downtimePeriodOperation } from "../operations/downtime-period";
import { downtimePeriodUndoOperation } from "../operations/downtime-period-undo";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { InventoryLogKind } from "@/lib/constants/inventory";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import { type Characteristics, DEFAULT_CHARACTERISTICS, readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import type { DowntimePeriodResult } from "@/systems/wfrp/rules/downtime/api-types";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const INT4_MAX = 2_147_483_647;

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

const inv = (id: string) => h.state.invs.get(id) as unknown as Inv;

const dm = (rules = WFRP_RULES) => ({ userId: "dm", isDM: true, campaign: { id: "camp", rules } });

const player = (userId: string, rules = WFRP_RULES) => ({ userId, isDM: false, campaign: { id: "camp", rules } });

const setDowntime = (access: ReturnType<typeof dm>, characterId: string, input: unknown) => runCharacterOperation(downtimeSetOperation, { campaignId: "camp", characterId, access: access as never }, input as never) as Promise<{ downtime: NonNullable<Characteristics["downtime"]> }>;

const period = (input: unknown, access = dm()) => runCharacterOperation(downtimePeriodOperation, { campaignId: "camp", characterId: "", access: access as never }, input as never) as Promise<DowntimePeriodResult>;

const undo = (input: unknown, access = dm()) => runCharacterOperation(downtimePeriodUndoOperation, { campaignId: "camp", characterId: "", access: access as never }, input as never) as Promise<DowntimePeriodResult>;

const withDowntime = (id: string, downtime: Characteristics["downtime"]) => put({ ...stored(id), characteristics: { ...stored(id).characteristics, downtime } });

const noWrites = () => {
  expect(h.character.update).not.toHaveBeenCalled();
  expect(h.characterInventory.update).not.toHaveBeenCalled();
  expect(h.characterLog.createMany).not.toHaveBeenCalled();
  expect(h.inventoryLog.createMany).not.toHaveBeenCalled();
};

const careerRow = (status: string) => ({ id: "car1", campaignId: "camp", name: "Merchant", tiers: [{ name: "T1", status, characteristics: [], skills: [], talents: [], trappings: [] }, ...[2, 3, 4].map((n) => ({ name: `T${n}`, characteristics: [], skills: [], talents: [], trappings: [] }))] });

const charm = { kind: "earn", params: { skill: "charm" } } as const;

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

describe("downtime.set", () => {
  it("owner sets the endeavour; null clears it and keeps lastPeriod and training", async () => {
    put(hero("h1"));

    const set = await setDowntime(player("owner-h1"), "h1", { endeavour: charm });

    expect(set.downtime.endeavour).toEqual(charm);
    expect(chars("h1").downtime?.endeavour).toEqual(charm);

    const training = { kind: "characteristic" as const, key: "ws", discount: 10 };

    withDowntime("h1", { endeavour: charm, ailments: [], training, lastPeriod: { id: "p0", at: "x", days: 1, before: { ailments: [] }, after: { ailmentIds: [] }, summary: { healed: 0, ailments: [] } } });

    const cleared = await setDowntime(player("owner-h1"), "h1", { endeavour: null });

    expect(cleared.downtime.endeavour).toBeUndefined();
    expect(chars("h1").downtime).toMatchObject({ training, lastPeriod: { id: "p0" } });
  });

  it("DM assigns ids to ailments; a player may not set them", async () => {
    put(hero("h1"));

    const ailments = [{ kind: "injury", daysLeft: 5, label: "Broken arm" }, { kind: "disease", daysLeft: 9, label: "Flu" }];

    const set = await setDowntime(dm(), "h1", { endeavour: null, ailments });

    expect(set.downtime.ailments.map((a) => a.label)).toEqual(["Broken arm", "Flu"]);
    expect(set.downtime.ailments.every((a) => a.id.length > 0)).toBe(true);

    await expect(setDowntime(player("owner-h1"), "h1", { endeavour: null, ailments })).rejects.toMatchObject({ message: API_ERRORS.FORBIDDEN, status: 403 });
  });

  it("another player is stopped by the gate", async () => {
    put(hero("h1"));

    await expect(setDowntime(player("stranger"), "h1", { endeavour: charm })).rejects.toMatchObject({ status: 403 });
    expect(h.character.update).not.toHaveBeenCalled();
  });

  it("rejects an untrained skill, a foreign patient, a battle, and a non-wfrp campaign", async () => {
    put(hero("h1", {}, { skillAdvances: {} }));
    put(hero("h2"));
    put(hero("far", { campaignId: "other" }));

    await expect(setDowntime(dm(), "h1", { endeavour: { kind: "train", params: { kind: "characteristic", key: "ws" } } })).rejects.toMatchObject({ message: API_ERRORS.SKILL_UNTRAINED, status: 409 });
    await expect(setDowntime(dm(), "h2", { endeavour: { kind: "tend", params: { patientId: "far" } } })).rejects.toMatchObject({ message: API_ERRORS.REST_CHARACTERS_INVALID, status: 400 });
    await expect(setDowntime(dm(DEFAULT_RULES as never), "h2", { endeavour: charm })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_UNSUPPORTED, status: 409 });

    h.state.inBattle = true;

    await expect(setDowntime(dm(), "h2", { endeavour: charm })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_IN_BATTLE, status: 409 });
    expect(h.character.update).not.toHaveBeenCalled();
  });
});

describe("downtime.period", () => {
  const twoHeroes = () => {
    put(hero("h1", {}, { downtime: { endeavour: charm, ailments: [] } }));
    put(hero("h2", { resources: { hp: 1 } }, { downtime: { endeavour: { kind: "rest", params: {} }, ailments: [] } }));
    h.state.careers = [careerRow("Silver 2")];
    put({ ...stored("h1"), characteristics: { ...stored("h1").characteristics, career: { careerId: "car1", tier: 1, ticks: [] } } });
  };

  it("heals, pays the income, snapshots the period and logs for every hero", async () => {
    twoHeroes();

    const result = await period({ days: 7, characterIds: ["h1", "h2"] });

    const first = chars("h1").downtime?.lastPeriod;

    const coins = first?.summary.endeavour?.coins;

    expect(coins).toMatchObject({ coin: "sp" });
    expect(coins?.amount).toBe(2 * Math.max(1, first?.summary.endeavour?.test?.sl ?? 0));
    expect(first?.id).toBe(result.periodId);
    expect(chars("h2").downtime?.lastPeriod?.id).toBe(result.periodId);
    expect((stored("h2").resources.hp as number | undefined) ?? Infinity).toBeGreaterThan(1);
    expect(inv("h1").silver).toBe(coins?.amount);
    expect(inv("h2")).toBeUndefined();
    expect(h.inventoryLog.createMany.mock.calls[0][0].data).toEqual([expect.objectContaining({ characterId: "h1", kind: InventoryLogKind.MONEY_GAIN })]);
    expect(h.characterLog.createMany.mock.calls[0][0].data.map((e: { kind: string; characterId: string }) => [e.characterId, e.kind])).toEqual([["h1", CharacterLogKind.DOWNTIME], ["h2", CharacterLogKind.DOWNTIME]]);
    expect(result.characters.find((c) => c.id === "h1")?.purse).toEqual({ gp: 0, sp: coins?.amount, cp: 0 });
    expect(result.characters.find((c) => c.id === "h2")).not.toHaveProperty("purse");
  });

  it("validates days (focus 1)", async () => {
    twoHeroes();

    for (const days of [0, 31]) await expect(period({ days, characterIds: ["h1"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_DAYS_INVALID, status: 400 });

    expect(downtimePeriodOperation.schema.safeParse({ days: 1.5, characterIds: ["h1"] }).success).toBe(false);

    await expect(period({ days: -1, characterIds: ["h1"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_DAYS_INVALID, status: 400 });
    expect(h.character.update).not.toHaveBeenCalled();
  });

  it("never heals above max wounds over 30 days", async () => {
    put(hero("h1", { resources: { hp: 1 } }, { downtime: { endeavour: { kind: "rest", params: {} }, ailments: [] } }));

    const { characters } = await period({ days: 30, characterIds: ["h1"] });

    expect(characters[0].resources).not.toHaveProperty("hp");
  });

  it("skips a dead hero but still snapshots and logs (focus 3)", async () => {
    put(hero("h1", { resources: { dead: true, hp: 0 } }, { downtime: { endeavour: charm, ailments: [] } }));

    const { characters } = await period({ days: 3, characterIds: ["h1"] });

    expect(characters[0].resources).toEqual({ dead: true, hp: 0 });
    expect(chars("h1").downtime?.lastPeriod?.summary.skipped).toBe("dead");
    expect(h.characterLog.createMany.mock.calls[0][0].data[0].data.summary.skipped).toBe("dead");
  });

  it("rejects inactive, foreign or unknown ids", async () => {
    put(hero("h1"));
    put(hero("gone", { status: "dead" }));
    put(hero("far", { campaignId: "other" }));

    for (const id of ["gone", "far", "missing"]) await expect(period({ days: 1, characterIds: ["h1", id] })).rejects.toMatchObject({ message: API_ERRORS.REST_CHARACTERS_INVALID, status: 400 });

    noWrites();
  });

  it("any hero in an active battle blocks the whole period (focus 4)", async () => {
    twoHeroes();
    h.state.inBattle = true;

    await expect(period({ days: 7, characterIds: ["h1", "h2"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_IN_BATTLE, status: 409 });
    noWrites();
  });

  it("checks every purse before the first write (focus 5)", async () => {
    twoHeroes();
    put(hero("h3", {}, { downtime: { endeavour: charm, ailments: [] } }));
    h.state.careers = [careerRow("Silver 2")];
    put({ ...stored("h3"), characteristics: { ...stored("h3").characteristics, career: { careerId: "car1", tier: 1, ticks: [] } } });
    h.state.invs.set("h3", { characterId: "h3", equipped: {}, backpack: [], items: [], stash: [], attuned: [], gold: 0, silver: INT4_MAX, copper: 0 });

    await expect(period({ days: 7, characterIds: ["h1", "h2", "h3"] })).rejects.toMatchObject({ message: API_ERRORS.MONEY_OVERFLOW, status: 409 });
    noWrites();
  });

  it("is refused when out-of-combat resources are not persisted", async () => {
    twoHeroes();

    const rules = { ...WFRP_RULES, outOfCombat: { ...WFRP_RULES.outOfCombat, persistResources: false } };

    await expect(period({ days: 7, characterIds: ["h1"] }, dm(rules))).rejects.toMatchObject({ message: API_ERRORS.OOC_RESOURCES_DISABLED, status: 409 });
    noWrites();
  });
});

describe("downtime.period.undo", () => {
  const ailment = { id: "a1", kind: "injury" as const, daysLeft: 20, label: "Cut" };

  const run = async () => {
    put(hero("h1", { resources: { hp: 1 } }, { downtime: { endeavour: charm, ailments: [ailment], training: { kind: "characteristic", key: "ws", discount: 10 } } }));
    put(hero("h2", { resources: { hp: 1 } }, { downtime: { endeavour: { kind: "rest", params: {} }, ailments: [] } }));
    h.state.careers = [careerRow("Silver 2")];
    put({ ...stored("h1"), characteristics: { ...stored("h1").characteristics, career: { careerId: "car1", tier: 1, ticks: [] } } });

    const result = await period({ days: 7, characterIds: ["h1", "h2"] });

    vi.clearAllMocks();

    return result;
  };

  it("restores hp, ailments, training and the purse", async () => {
    const { periodId } = await run();

    const coins = chars("h1").downtime?.lastPeriod?.coins;

    expect(coins).toBeDefined();

    const result = await undo({ periodId, characterIds: ["h1", "h2"] });

    expect(stored("h1").resources.hp).toBe(1);
    expect(stored("h2").resources.hp).toBe(1);
    expect(chars("h1").downtime).toEqual({ endeavour: charm, ailments: [ailment], training: { kind: "characteristic", key: "ws", discount: 10 } });
    expect(chars("h1").downtime).not.toHaveProperty("lastPeriod");
    expect(inv("h1").silver).toBe(0);
    expect(h.inventoryLog.createMany.mock.calls[0][0].data[0].kind).toBe(InventoryLogKind.MONEY_SPEND);
    expect(h.characterLog.createMany.mock.calls[0][0].data.map((e: { data: unknown }) => e.data)).toEqual([{ periodId, undo: true }, { periodId, undo: true }]);
    expect(result.characters.find((c) => c.id === "h1")?.purse).toEqual({ gp: 0, sp: 0, cp: 0 });
  });

  it("undoes when jsonb returns training and ailment keys in another order", async () => {
    const { periodId } = await run();

    const { lastPeriod } = (stored("h1").characteristics as { downtime: { lastPeriod: { before: { training?: Record<string, unknown>; ailments: Record<string, unknown>[] }; after: { training?: Record<string, unknown> } } } }).downtime;

    const reverse = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).reverse());

    expect(lastPeriod.after.training).toBeDefined();

    lastPeriod.after.training = reverse(lastPeriod.after.training ?? {});

    if (lastPeriod.before.training) lastPeriod.before.training = reverse(lastPeriod.before.training);

    lastPeriod.before.ailments = lastPeriod.before.ailments.map(reverse);

    await undo({ periodId, characterIds: ["h1", "h2"] });

    expect(chars("h1").downtime?.training).toEqual({ kind: "characteristic", key: "ws", discount: 10 });
    expect(chars("h1").downtime?.ailments).toEqual([ailment]);
  });

  it("a second undo of the same period is stale (focus 2)", async () => {
    const { periodId } = await run();

    await undo({ periodId, characterIds: ["h1", "h2"] });

    await expect(undo({ periodId, characterIds: ["h1", "h2"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_STALE, status: 409 });
  });

  it("a manual hp change on one hero leaves both untouched (focus 2)", async () => {
    const { periodId } = await run();

    put({ ...stored("h1"), resources: { hp: 2 } });

    const snapshot = JSON.stringify([stored("h1"), stored("h2")]);

    await expect(undo({ periodId, characterIds: ["h1", "h2"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_STALE });
    expect(JSON.stringify([stored("h1"), stored("h2")])).toBe(snapshot);
    noWrites();
  });

  it("is stale after the income was spent or the discount was used", async () => {
    const first = await run();

    inv("h1").silver = 0;

    await expect(undo({ periodId: first.periodId, characterIds: ["h1"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_STALE });

    inv("h1").silver = chars("h1").downtime?.lastPeriod?.coins?.amount ?? 0;

    const d = chars("h1").downtime ?? { ailments: [] };

    const { training: _spent, ...withoutTraining } = d;

    withDowntime("h1", withoutTraining);

    await expect(undo({ periodId: first.periodId, characterIds: ["h1"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_STALE });
  });

  it("still works after the DM saved the sheet through PATCH", async () => {
    const { periodId } = await run();

    const row = stored("h1");

    put({ ...row, characteristics: JSON.parse(JSON.stringify(readCharacteristics({ characteristics: row.characteristics }))) });

    expect(chars("h1").downtime?.lastPeriod?.id).toBe(periodId);

    await expect(undo({ periodId, characterIds: ["h1", "h2"] })).resolves.toMatchObject({ periodId });
  });
});

describe("downtime training discount end to end", () => {
  const advance = (input: unknown) => runCharacterOperation(advanceOperation, { campaignId: "camp", characterId: "h1", access: dm() as never }, input as never) as Promise<{ entry: { cost: number; discount?: number } }>;

  const advanceUndo = () => runCharacterOperation(advanceUndoOperation, { campaignId: "camp", characterId: "h1", access: dm() as never }, {} as never);

  it("train period grants a credit, advance spends it, undo order is enforced", async () => {
    put(hero("h1", { experience: 1000 }, { downtime: { endeavour: { kind: "train", params: { kind: "characteristic", key: "ws" } }, ailments: [] } }));

    const { periodId } = await period({ days: 7, characterIds: ["h1"] });

    const credit = chars("h1").downtime?.training?.discount ?? 0;

    expect(credit).toBeGreaterThan(0);

    const bought = await advance({ kind: "characteristic", key: "ws" });

    expect(bought.entry.discount).toBe(credit);
    expect(chars("h1").downtime).not.toHaveProperty("training");

    await expect(undo({ periodId, characterIds: ["h1"] })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_STALE, status: 409 });

    await advanceUndo();

    expect(chars("h1").downtime?.training?.discount).toBe(credit);

    await expect(undo({ periodId, characterIds: ["h1"] })).resolves.toMatchObject({ periodId });
  });

  it("a non-wfrp campaign refuses set, period and undo", async () => {
    put(hero("h1"));

    const rules = DEFAULT_RULES as never;

    await expect(setDowntime(dm(rules), "h1", { endeavour: charm })).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_UNSUPPORTED, status: 409 });
    await expect(period({ days: 1, characterIds: ["h1"] }, dm(rules))).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_UNSUPPORTED, status: 409 });
    await expect(undo({ periodId: "p", characterIds: ["h1"] }, dm(rules))).rejects.toMatchObject({ message: API_ERRORS.DOWNTIME_UNSUPPORTED, status: 409 });
  });
});
