/**
 * Пише в БД — лише локальна Docker-БД (pnpm db:local). На будь-якому іншому хості — skip.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE, ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import {
  BattleConflictError,
  loadBattle,
  loadBattleAccess,
  loadEventsBefore,
  loadRecentEvents,
  loadSnapshotsFrom,
  restoreParticipantsAt,
  saveBattle,
} from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const url = process.env.DATABASE_URL ?? "";

const isLocal = /@(localhost|127\.0\.0\.1):/.test(url);

const ids = { user: "it-user", dm: "it-dm", campaign: "it-campaign", battle: "it-battle" };

const hero = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "hero", battleId: ids.battle, controlledBy: ids.user },
});

const goblin = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "gob", battleId: ids.battle, side: ParticipantSide.ENEMY, controlledBy: "dm" },
});

async function mustLoad() {
  const battle = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm });

  if (!battle) throw new Error("battle not found");

  return battle;
}

function countingDb() {
  const calls: unknown[] = [];

  const wrap = <T extends object>(target: T): T =>
    new Proxy(target, {
      get(t, key) {
        const value = Reflect.get(t, key);

        if (typeof value === "function") {
          return (...args: unknown[]) => Promise.resolve(value.apply(t, args)).then((r: unknown) => (calls.push(r), r));
        }

        return value && typeof value === "object" ? wrap(value as object) : value;
      },
    });

  const db = { ...prisma, $transaction: (fn: (tx: unknown) => Promise<unknown>) => prisma.$transaction((tx) => fn(wrap(tx))) };

  return { db: db as unknown as typeof prisma, calls };
}

async function cleanup() {
  await prisma.battleScene.deleteMany({ where: { id: ids.battle } });
  await prisma.campaign.deleteMany({ where: { id: ids.campaign } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.user, ids.dm] } } });
}

describe.skipIf(!isLocal)("battle store (local DB)", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.user.createMany({
      data: [
        { id: ids.user, email: "it-user@x.test", displayName: "Гравець" },
        { id: ids.dm, email: "it-dm@x.test", displayName: "DM" },
      ],
    });
    await prisma.campaign.create({
      data: {
        id: ids.campaign,
        name: "IT",
        inviteCode: "it-code",
        dmUserId: ids.dm,
        members: {
          create: [
            { userId: ids.user, role: "player" },
            { userId: ids.dm, role: "dm" },
          ],
        },
      },
    });
    await prisma.battleScene.create({
      data: { id: ids.battle, campaignId: ids.campaign, name: "Бій", status: "active" },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("порожній бій завантажується; DM визначається з членства", async () => {
    const asDm = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm });

    expect(asDm?.isDM).toBe(true);
    expect(asDm?.participants).toEqual([]);
    expect(asDm?.scene.version).toBe(0);

    const asPlayer = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.user });

    expect(asPlayer?.isDM).toBe(false);
    expect(asPlayer?.isMember).toBe(true);

    expect(await loadBattle(prisma, { battleId: ids.battle, campaignId: "other", userId: ids.dm })).toBeNull();
  });

  it("збереження створює учасників, подію і знімок; версія +1", async () => {
    const before = await mustLoad();

    const delta = await saveBattle(prisma, before, {
      participants: [hero, goblin],
      pending: [],
      events: [{ type: "start", round: 1, resultText: "Бій почався" }],
    });

    expect(delta.version).toBe(1);
    expect(delta.upserted.map((p) => p.basicInfo.id).sort()).toEqual(["gob", "hero"]);
    expect(delta.events[0].seq).toBe(1);
    expect([...delta.fullIds].sort()).toEqual(["gob", "hero"]);

    const after = await mustLoad();

    expect(after.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
    expect(after.participants[0]).toEqual(hero);
    expect(after.scene.eventSeq).toBe(1);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle } })).toBe(1);
  });

  it("зміна HP одного учасника — у дельті лише він", async () => {
    const before = await mustLoad();

    const hurt = { ...before.participants[1], combatStats: { ...before.participants[1].combatStats, currentHp: 2 } };

    const delta = await saveBattle(prisma, before, {
      participants: [before.participants[0], hurt],
      pending: [],
      events: [{ type: "attack", round: 1, actorId: "hero", resultText: "Удар" }],
    });

    expect(delta.upserted.map((p) => p.basicInfo.id)).toEqual(["gob"]);
    expect(delta.fullIds).toEqual([]);
    expect(delta.removed).toEqual([]);
  });

  it("оновлення учасників: кількість запитів не залежить від їх числа, рядки назад не читаються", async () => {
    const hurt = (p: BattleParticipant, hp: number) => ({ ...p, combatStats: { ...p.combatStats, currentHp: hp } });

    const one = countingDb();

    const b1 = await mustLoad();

    await saveBattle(one.db, b1, { participants: [hurt(b1.participants[0], 7), b1.participants[1]], pending: [], events: [{ type: "attack", round: 1, resultText: "Удар" }] });

    const two = countingDb();

    const b2 = await mustLoad();

    const delta = await saveBattle(two.db, b2, { participants: [hurt(b2.participants[0], 6), hurt(b2.participants[1], 1)], pending: [], events: [{ type: "attack", round: 1, resultText: "Удар" }] });

    expect(two.calls.length).toBe(one.calls.length);
    expect(JSON.stringify(two.calls)).not.toContain("snapshot");

    const after = await mustLoad();

    expect(after.participants.map((p) => p.combatStats.currentHp)).toEqual([6, 1]);
    expect(after.participants[0]).toEqual(hurt(b2.participants[0], 6));
    expect(delta.upserted.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
  });

  it("зміна знімка пишеться тим самим UPDATE", async () => {
    const before = await mustLoad();

    const buffed = { ...before.participants[0], combatStats: { ...before.participants[0].combatStats, armorClass: 25 } };

    const delta = await saveBattle(prisma, before, { participants: [buffed, before.participants[1]], pending: [], events: [] });

    expect(delta.fullIds).toEqual(["hero"]);
    expect((await mustLoad()).participants[0]).toEqual(buffed);
  });

  it("два збереження з однієї версії — друге отримує конфлікт", async () => {
    const before = await mustLoad();

    const outcome = { participants: before.participants, pending: [], events: [] };

    await saveBattle(prisma, before, outcome);

    await expect(saveBattle(prisma, before, outcome)).rejects.toBeInstanceOf(BattleConflictError);
  });

  it("pendingMoraleCheck: null записується як SQL NULL", async () => {
    const before = await mustLoad();

    await saveBattle(prisma, before, {
      scene: { pendingMoraleCheck: { participantId: "hero", d10Roll: 5 } },
      participants: before.participants,
      pending: [],
      events: [],
    });

    const mid = await mustLoad();

    await saveBattle(prisma, mid, { scene: { pendingMoraleCheck: null }, participants: mid.participants, pending: [], events: [] });

    const rows = await prisma.$queryRaw<Array<{ isnull: boolean }>>`
      SELECT "pendingMoraleCheck" IS NULL AS isnull FROM battle_scenes WHERE id = ${ids.battle}
    `;

    expect(rows[0].isnull).toBe(true);
  });

  it("дія без подій: версія росте, eventSeq і кількість знімків — ні", async () => {
    const before = await mustLoad();

    const snapshots = await prisma.battleSnapshot.count({ where: { battleId: ids.battle } });

    const delta = await saveBattle(prisma, before, { participants: before.participants, pending: [], events: [] });

    const after = await mustLoad();

    expect(delta.version).toBe(before.scene.version + 1);
    expect(after.scene.eventSeq).toBe(before.scene.eventSeq);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle } })).toBe(snapshots);
  });

  it("учасник у pending завантажується окремо", async () => {
    const before = await mustLoad();

    const summon = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "wolf", controlledBy: ids.user } });

    await saveBattle(prisma, before, { participants: before.participants, pending: [summon], events: [] });

    const after = await mustLoad();

    expect(after.pending.map((p) => p.basicInfo.id)).toEqual(["wolf"]);
    expect(after.participants.map((p) => p.basicInfo.id)).not.toContain("wolf");
  });
  it("відкат: знімки з seq, скасування подій і повернення стану", async () => {
    const before = await mustLoad();

    const hurt = { ...before.participants[0], combatStats: { ...before.participants[0].combatStats, currentHp: 1 } };

    await saveBattle(prisma, before, { participants: [hurt, ...before.participants.slice(1)], pending: before.pending, events: [{ type: "attack", round: 1, resultText: "Удар" }] });

    const after = await mustLoad();

    const seq = after.scene.eventSeq;

    const snapshots = await loadSnapshotsFrom(prisma, ids.battle, seq);

    expect(snapshots[0].seq).toBe(seq);

    const restored = restoreParticipantsAt(snapshots, after);

    expect(restored.participants[0].combatStats.currentHp).toBe(before.participants[0].combatStats.currentHp);

    await saveBattle(prisma, after, { ...restored, events: [], history: { cancelFromSeq: seq } });

    const events = await loadRecentEvents(prisma, ids.battle);

    expect(events.map((e) => e.actionIndex)).not.toContain(seq);
    expect(await prisma.battleSnapshot.count({ where: { battleId: ids.battle, seq: { gte: seq } } })).toBe(0);
  });

  it("завершення бою лишає лише останні знімки (відкат після завершення можливий)", async () => {
    for (let i = 0; i < BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE + 3; i++) {
      const before = await mustLoad();

      await saveBattle(prisma, before, { participants: before.participants, pending: before.pending, events: [{ type: "attack", round: 1, resultText: `Удар ${i}` }] });
    }

    const before = await mustLoad();

    await saveBattle(prisma, before, {
      scene: { status: "completed", completedAt: new Date() },
      participants: before.participants,
      pending: before.pending,
      events: [{ type: "end_turn", round: 1, resultText: "Бій завершено" }],
    });

    const after = await mustLoad();

    const kept = await prisma.battleSnapshot.findMany({ where: { battleId: ids.battle }, select: { seq: true }, orderBy: { seq: "desc" } });

    expect(kept).toHaveLength(BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE);
    expect(kept[0].seq).toBe(after.scene.eventSeq);
    expect(await prisma.battleEvent.count({ where: { battleId: ids.battle } })).toBeGreaterThan(BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE);
  });

  it("сторінка журналу до seq: старіші події по зростанню, hasMore; доступ — лише версія й членство", async () => {
    const before = await mustLoad();

    const last = before.scene.eventSeq;

    const page = await loadEventsBefore(prisma, ids.battle, { before: last, limit: 3 });

    expect(page.events.map((e) => e.actionIndex)).toEqual([last - 3, last - 2, last - 1]);
    expect(page.hasMore).toBe(true);
    expect(page.events[0]).toMatchObject({ battleId: ids.battle, resultText: expect.any(String) });

    const first = await loadEventsBefore(prisma, ids.battle, { before: 3, limit: 50 });

    expect(first.events.every((e) => e.actionIndex < 3 && !e.isCancelled)).toBe(true);
    expect(first.hasMore).toBe(false);

    expect(await loadBattleAccess(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.user })).toEqual({ version: before.scene.version, isMember: true });
    expect(await loadBattleAccess(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: "stranger" })).toEqual({ version: before.scene.version, isMember: false });
    expect(await loadBattleAccess(prisma, { battleId: ids.battle, campaignId: "other", userId: ids.user })).toBeNull();
  });

  it("clear: журнал і знімки порожні, eventSeq = 0", async () => {
    const before = await mustLoad();

    await saveBattle(prisma, before, { participants: [], pending: [], events: [], history: { clear: true } });

    const after = await mustLoad();

    expect(after.scene.eventSeq).toBe(0);
    expect(await prisma.battleEvent.count({ where: { battleId: ids.battle } })).toBe(0);
    expect(after.participants).toEqual([]);
  });
});
