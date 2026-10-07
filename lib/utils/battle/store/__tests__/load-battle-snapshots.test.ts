import { beforeEach, describe, expect, it, vi } from "vitest";

import { type BattleDb, loadBattle } from "../load-battle";
import { clearSnapshotCache, createSnapshotCache, SNAPSHOT_CACHE_MAX } from "../snapshot-cache";
import { splitParticipant } from "../split-participant";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", battleId: "b1", name: "Герой" } });

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", battleId: "b1", name: "Гоблін", side: ParticipantSide.ENEMY } });

const stored = [hero, goblin].map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false }));

const columnsRow = (s: (typeof stored)[number]) => ({ ...s.columns, battleId: "b1", state: s.state, snapshotHash: s.snapshotHash });

function fakeDb(rows = stored) {
  const findFirst = vi.fn(async () => ({
    id: "b1",
    campaignId: "c1",
    name: "Бій",
    description: null,
    status: "active",
    currentRound: 1,
    currentTurnIndex: 0,
    version: 3,
    eventSeq: 0,
    pendingMoraleCheck: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(0),
    participants: [],
    battleParticipants: rows.map(columnsRow),
    campaign: { friendlyFire: false, members: [{ role: "dm" }] },
  }));

  const findMany = vi.fn(async (args: { where: { id: { in: string[] } } }) =>
    rows.filter((r) => args.where.id.in.includes(r.columns.id)).map((r) => ({ id: r.columns.id, snapshot: r.snapshot, snapshotHash: r.snapshotHash })),
  );

  return { db: { battleScene: { findFirst }, battleParticipant: { findMany } } as unknown as BattleDb, findFirst, findMany };
}

const load = (db: BattleDb) => loadBattle(db, { battleId: "b1", campaignId: "c1", userId: "dm" });

describe("loadBattle: снапшоти учасників", () => {
  beforeEach(() => clearSnapshotCache());

  it("основний запит не читає снапшоти; відсутні в кеші — одним запитом за id", async () => {
    const { db, findFirst, findMany } = fakeDb();

    const loaded = await load(db);

    const select = (findFirst.mock.calls[0] as unknown as [{ select: { battleParticipants: { select: Record<string, boolean> } } }])[0].select;

    expect(select.battleParticipants.select.snapshot).toBeUndefined();
    expect(select.battleParticipants.select.snapshotHash).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.id.in).toEqual([hero.basicInfo.id, goblin.basicInfo.id]);
    expect(loaded?.participants.map((p) => p.basicInfo.name)).toEqual([hero.basicInfo.name, goblin.basicInfo.name]);
  });

  it("повторне читання з тими самими хешами не тягне снапшоти з БД і дає ті самі учасники", async () => {
    const { db, findMany } = fakeDb();

    const first = await load(db);

    findMany.mockClear();

    const second = await load(db);

    expect(findMany).not.toHaveBeenCalled();
    expect(second?.participants).toEqual(first?.participants);
  });

  it("змінений снапшот (новий хеш) — дочитує лише його", async () => {
    await load(fakeDb().db);

    const buffed = splitParticipant({ ...goblin, combatStats: { ...goblin.combatStats, armorClass: 19 } }, { orderIndex: 1, isPending: false });

    const { db, findMany } = fakeDb([stored[0], buffed]);

    const loaded = await load(db);

    expect(findMany.mock.calls[0][0].where.id.in).toEqual([goblin.basicInfo.id]);
    expect(loaded?.participants[1].combatStats.armorClass).toBe(19);
  });

  it("якщо дочитаний снапшот має інший хеш, пара (хеш, снапшот) береться з дочитаного", async () => {
    const buffed = splitParticipant({ ...goblin, combatStats: { ...goblin.combatStats, armorClass: 19 } }, { orderIndex: 1, isPending: false });

    const { db, findMany } = fakeDb();

    findMany.mockImplementationOnce(async () => [
      { id: hero.basicInfo.id, snapshot: stored[0].snapshot, snapshotHash: stored[0].snapshotHash },
      { id: goblin.basicInfo.id, snapshot: buffed.snapshot, snapshotHash: buffed.snapshotHash },
    ]);

    const loaded = await load(db);

    expect(loaded?.participants[1].combatStats.armorClass).toBe(19);

    findMany.mockClear();
    await load(fakeDb([stored[0], buffed]).db);

    expect(findMany).not.toHaveBeenCalled();
  });

  it("зміни учасника рушієм не псують кеш", async () => {
    const { db } = fakeDb();

    const [touched] = (await load(db))?.participants ?? [];

    const pristine = structuredClone((await load(db))?.participants);

    touched.basicInfo.name = "Зіпсований";
    touched.combatStats.armorClass = 0;

    expect((await load(db))?.participants).toEqual(pristine);
  });
});

describe("createSnapshotCache", () => {
  it("витісняє найдавніше використаний запис понад ліміт", () => {
    const cache = createSnapshotCache(2);

    cache.remember("a", { n: 1 });
    cache.remember("b", { n: 2 });
    cache.get("a");
    cache.remember("c", { n: 3 });

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toEqual({ n: 1 });
    expect(cache.get("c")).toEqual({ n: 3 });
  });

  it("кожне читання — окрема копія", () => {
    const cache = createSnapshotCache(2);

    cache.remember("a", { list: [1] });
    (cache.get("a")?.list as number[]).push(2);

    expect(cache.get("a")).toEqual({ list: [1] });
  });

  it("ліміт за замовчуванням тримає кілька великих боїв", () => {
    expect(SNAPSHOT_CACHE_MAX).toBeGreaterThanOrEqual(500);
  });
});
