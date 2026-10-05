import type { PrismaClient } from "@prisma/client";

import { joinParticipant } from "./split-participant";
import type { BattleSceneState, BattleStatus, LoadedBattle, ParticipantColumns, ParticipantSnapshot, ParticipantState } from "./types";

import type { BattleParticipant, BattlePreparationParticipant } from "@/types/battle";

export type BattleDb = Pick<
  PrismaClient,
  "battleScene" | "battleParticipant" | "battleEvent" | "battleSnapshot" | "$transaction"
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
      battleParticipants: { orderBy: { orderIndex: "asc" } },
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

  const all = row.battleParticipants.map((p) => ({ isPending: p.isPending, participant: rowToParticipant(p) }));

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
    isDM: membership?.role === "dm",
    isMember: Boolean(membership),
  };
}
