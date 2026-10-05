/**
 * Пише в БД — лише локальна Docker-БД (pnpm db:local). На будь-якому іншому хості — skip.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import {
  BattleConflictError,
  loadBattle,
  loadRecentEvents,
  loadSnapshotsFrom,
  restoreParticipantsAt,
  saveBattle,
} from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

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
    expect(delta.removed).toEqual([]);
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

  it("clear: журнал і знімки порожні, eventSeq = 0", async () => {
    const before = await mustLoad();

    await saveBattle(prisma, before, { participants: [], pending: [], events: [], history: { clear: true } });

    const after = await mustLoad();

    expect(after.scene.eventSeq).toBe(0);
    expect(await prisma.battleEvent.count({ where: { battleId: ids.battle } })).toBe(0);
    expect(after.participants).toEqual([]);
  });
});
