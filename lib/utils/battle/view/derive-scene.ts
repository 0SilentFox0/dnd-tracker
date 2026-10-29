import { type QueueEntry,turnQueue } from "./queue";
import { canSeeEnemyHp } from "./visibility";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

const NO_ORDER: BattleParticipant[] = [];

export function deriveScene(battle: BattleScene, userId: string | null, dmControlledId: string | null) {
  const isDM = battle.isDM === true;

  const order = battle.initiativeOrder ?? [];

  const reserveAll = reserveOf(battle.pendingSummons ?? []);

  const awaiting = battle.status === BattleStatus.ACTIVE ? checkVictoryConditions(order, reserveAll).awaiting : null;

  const { current, isMyTurn, myParticipants, hero } = deriveTurn(battle, userId, isDM, dmControlledId, awaiting !== null);

  return {
    viewer: { userId, isDM, canSeeEnemyHp: canSeeEnemyHp(hero, order) },
    turn: { current, isMyTurn, queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound) },
    roster: {
      allies: order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY),
      enemies: order.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY),
      reserve: isDM ? reserveAll : NO_ORDER,
      myParticipants,
      hero,
    },
    awaiting,
  };
}

export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null, awaiting = false) {
  const order = battle.initiativeOrder ?? [];

  const current = order[battle.currentTurnIndex] ?? null;

  const myParticipants = order.filter((p) => p.basicInfo.controlledBy === userId);

  const controls = (p: BattleParticipant) =>
    p.basicInfo.controlledBy === userId ||
    (isDM && (p.basicInfo.id === dmControlledId || p.basicInfo.controlledBy === CONTROLLED_BY_DM || p.basicInfo.side === ParticipantSide.ENEMY));

  const isMyTurn = battle.status === BattleStatus.ACTIVE && !awaiting && !!current && !!userId && controls(current);

  const dmHero = isDM && dmControlledId ? order.find((p) => p.basicInfo.id === dmControlledId) ?? null : null;

  const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

  const nextMine = turnQueue(order, battle.currentTurnIndex, battle.currentRound ?? 1).find(
    (e): e is Extract<QueueEntry, { participant: BattleParticipant }> => e.kind !== "round" && !e.down && mine.has(e.participant.basicInfo.id),
  )?.participant;

  const hero = (isMyTurn ? current : null) ?? dmHero ?? nextMine ?? myParticipants[0] ?? (isDM ? current : null);

  return { current, isMyTurn, myParticipants, hero };
}
