/**
 * Наскрізний флоу бою через runBattleMutation і справжнє сховище. Лише локальна Docker-БД.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { createRollbackMutation, rollbackSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { loadBattle, loadRecentEvents, loadSnapshotsFrom, saveBattle } from "@/lib/utils/battle/store";

const url = process.env.DATABASE_URL ?? "";

const isLocal = /@(localhost|127\.0\.0\.1):/.test(url);

const ids = { player: "flow-player", dm: "flow-dm", campaign: "flow-campaign", battle: "flow-battle" };

const params = { id: ids.campaign, battleId: ids.battle };

const base = createMockParticipant();

const hero = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "hero", battleId: ids.battle, controlledBy: ids.player, name: "Арвен" },
  battleData: {
    ...base.battleData,
    attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }],
  },
});

const goblin = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "gob", battleId: ids.battle, side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Гоблін" },
  combatStats: { ...base.combatStats, maxHp: 30, currentHp: 30 },
});

function deps(userId: string) {
  return {
    getUserId: async () => userId,
    rateLimit: async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 }),
    loadBattle: (args) => loadBattle(prisma, args),
    saveBattle: (before, outcome) => saveBattle(prisma, before, outcome),
    loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
    publish: vi.fn<PipelineDeps["publish"]>(),
  } satisfies PipelineDeps;
}

const post = (body: unknown) => new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });

async function cleanup() {
  await prisma.battleScene.deleteMany({ where: { id: ids.battle } });
  await prisma.campaign.deleteMany({ where: { id: ids.campaign } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.player, ids.dm] } } });
}

async function current() {
  const battle = await loadBattle(prisma, { battleId: ids.battle, campaignId: ids.campaign, userId: ids.dm });

  if (!battle) throw new Error("battle not found");

  return battle;
}

describe.skipIf(!isLocal)("battle flow (local DB)", () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.user.createMany({
      data: [
        { id: ids.player, email: "flow-player@x.test", displayName: "Гравець" },
        { id: ids.dm, email: "flow-dm@x.test", displayName: "DM" },
      ],
    });
    await prisma.campaign.create({
      data: {
        id: ids.campaign,
        name: "Flow",
        inviteCode: "flow-code",
        dmUserId: ids.dm,
        members: { create: [{ userId: ids.player, role: "player" }, { userId: ids.dm, role: "dm" }] },
      },
    });
    await prisma.battleScene.create({ data: { id: ids.battle, campaignId: ids.campaign, name: "Флоу", status: "active" } });
    await saveBattle(prisma, await current(), { participants: [hero, goblin], pending: [], events: [] });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("атака з переходом ходу → наступний хід → відкат до стану перед атакою", async () => {
    const before = await current();

    const player = deps(ids.player);

    const attackRes = await runBattleMutation(
      post({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [8], endTurn: true }),
      { params, access: "member", requireStatus: "active", schema: attackBodySchema, mutate: attackMutation },
      player,
    );

    const attacked = await attackRes.json();

    expect(attackRes.status).toBe(200);
    expect(attacked.currentTurnIndex).toBe(1);
    expect(attacked.battleLogMode).toBe("append");
    expect(player.publish.mock.calls[0][0][0]).toMatchObject({ event: "battle-updated" });

    const attackSeq = attacked.battleLog[0].actionIndex as number;

    const dm = deps(ids.dm);

    const nextRes = await runBattleMutation(post({}), { params, access: "currentController", requireStatus: "active", mutate: nextTurnMutation }, dm);

    expect(nextRes.status).toBe(200);

    const rollbackRes = await runBattleMutation(
      post({ actionIndex: attackSeq }),
      { params, access: "dm", schema: rollbackSchema, mutate: createRollbackMutation((battleId, seq) => loadSnapshotsFrom(prisma, battleId, seq)) },
      dm,
    );

    expect(rollbackRes.status).toBe(200);

    const after = await current();

    expect(after.scene.turnIndex).toBe(before.scene.turnIndex);
    expect(after.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(30);

    const log = await loadRecentEvents(prisma, ids.battle);

    expect(log.every((e) => e.actionIndex < attackSeq)).toBe(true);
  });
});
