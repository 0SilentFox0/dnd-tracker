import type { PrismaClient } from "@prisma/client";

import { snapshotCache } from "./snapshot-cache";
import { joinParticipant } from "./split-participant";
import type { BattleSceneState, BattleStatus, LoadedBattle, ParticipantColumns, ParticipantSnapshot, ParticipantState } from "./types";

import { CampaignRole } from "@/lib/constants/campaigns";
import type { BattleParticipant, BattlePreparationParticipant } from "@/types/battle";

export type BattleDb = Pick<
  PrismaClient,
  "battleScene" | "battleParticipant" | "battleEvent" | "battleSnapshot" | "$transaction" | "$queryRaw" | "$executeRaw"
>;

type ParticipantRow = ParticipantColumns & {
  battleId: string;
  snapshot: unknown;
  state: unknown;
  snapshotHash: string;
};

export function rowToParticipant(row: ParticipantRow): BattleParticipant {
  const { battleId, snapshot, state, snapshotHash, ...columns } = row;

  return joinParticipant(
    {
      columns,
      snapshot: snapshot as ParticipantSnapshot,
      state: state as ParticipantState,
      snapshotHash,
    },
    battleId,
  );
}

const PARTICIPANT_ROW_SELECT = {
  id: true,
  battleId: true,
  sourceType: true,
  sourceId: true,
  side: true,
  controlledBy: true,
  orderIndex: true,
  isPending: true,
  extraTurnOf: true,
  currentHp: true,
  tempHp: true,
  maxHp: true,
  morale: true,
  status: true,
  initiative: true,
  hasUsedAction: true,
  hasUsedBonusAction: true,
  hasUsedReaction: true,
  hasExtraTurn: true,
  state: true,
  snapshotHash: true,
} as const;

/** Snapshots (the bulk of a battle row set) rarely change between actions: only cache misses are read. */
async function withSnapshots(db: BattleDb, rows: Array<Omit<ParticipantRow, "snapshot">>): Promise<ParticipantRow[]> {
  const known = new Map(rows.map((r) => [r.id, snapshotCache.get(r.snapshotHash)]));

  const missing = rows.filter((r) => known.get(r.id) === undefined).map((r) => r.id);

  const fetched = missing.length
    ? await db.battleParticipant.findMany({ where: { id: { in: missing } }, select: { id: true, snapshot: true, snapshotHash: true } })
    : [];

  for (const f of fetched) {
    snapshotCache.remember(f.snapshotHash, f.snapshot);
    known.set(f.id, f.snapshot as ParticipantSnapshot);
  }

  // a participant deleted between the two reads is dropped, like a row the scene query missed
  return rows.flatMap((r) => {
    const snapshot = known.get(r.id);

    return snapshot === undefined ? [] : [{ ...r, snapshot }];
  });
}

export async function loadBattle(
  db: BattleDb,
  args: { battleId: string; campaignId: string; userId: string },
): Promise<(LoadedBattle & { isMember: boolean }) | null> {
  const row = await db.battleScene.findFirst({
    where: { id: args.battleId, campaignId: args.campaignId },
    select: {
      id: true,
      campaignId: true,
      name: true,
      description: true,
      status: true,
      currentRound: true,
      currentTurnIndex: true,
      version: true,
      eventSeq: true,
      pendingMoraleCheck: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      participants: true,
      battleParticipants: { orderBy: { orderIndex: "asc" }, select: PARTICIPANT_ROW_SELECT },
      campaign: {
        select: { friendlyFire: true, members: { where: { userId: args.userId }, select: { role: true } } },
      },
    },
  });

  if (!row) return null;

  const scene: BattleSceneState = {
    id: row.id,
    campaignId: row.campaignId,
    status: row.status as BattleStatus,
    round: row.currentRound,
    turnIndex: row.currentTurnIndex,
    version: row.version,
    eventSeq: row.eventSeq,
    pendingMoraleCheck: row.pendingMoraleCheck ?? null,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };

  const membership = row.campaign.members[0];

  const all = (await withSnapshots(db, row.battleParticipants)).map((p) => ({ isPending: p.isPending, participant: rowToParticipant(p) }));

  return {
    scene,
    meta: {
      name: row.name,
      description: row.description,
      setup: (row.participants ?? []) as unknown as BattlePreparationParticipant[],
      friendlyFire: row.campaign.friendlyFire ?? false,
      createdAt: row.createdAt,
    },
    participants: all.filter((p) => !p.isPending).map((p) => p.participant),
    pending: all.filter((p) => p.isPending).map((p) => p.participant),
    isDM: membership?.role === CampaignRole.DM,
    isMember: Boolean(membership),
  };
}

export async function loadBattleAccess(
  db: BattleDb,
  args: { battleId: string; campaignId: string; userId: string },
): Promise<{ version: number; isMember: boolean } | null> {
  const row = await db.battleScene.findFirst({
    where: { id: args.battleId, campaignId: args.campaignId },
    select: { version: true, campaign: { select: { members: { where: { userId: args.userId }, select: { userId: true } } } } },
  });

  return row ? { version: row.version, isMember: row.campaign.members.length > 0 } : null;
}
