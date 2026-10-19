import { isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { canStartAttack, pickAttack } from "@/lib/utils/battle/grid";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export interface AttackIntent {
  targetId: string;
  attackId?: string;
  actorId: string;
  round: number;
  turnIndex: number;
}

interface TurnPoint {
  round: number;
  turnIndex: number;
}

export function isIntentStale(intent: AttackIntent, turn: TurnPoint): boolean {
  return intent.round !== turn.round || intent.turnIndex !== turn.turnIndex;
}

export interface TurnAttackStatus {
  phase: string;
  actionUsed: boolean;
  skipped: boolean;
}

export function turnAllowsAttack({ phase, actionUsed, skipped }: TurnAttackStatus): boolean {
  return phase === "acting" && !actionUsed && !skipped;
}

export function canConsumeIntent(intent: AttackIntent, turn: TurnPoint & TurnAttackStatus & { heroId: string }): boolean {
  return !isIntentStale(intent, turn) && intent.actorId === turn.heroId && turnAllowsAttack(turn);
}

export interface ParticipantClickScene {
  battle: Pick<BattleScene, "map" | "initiativeOrder" | "currentRound" | "currentTurnIndex">;
  turn: { current: BattleParticipant | null; isMyTurn: boolean };
  anyPending: boolean;
  /** Фаза ходу героя дозволяє атаку (не мораль і не кінець ходу) — інакше намір ніхто не підхопить */
  attackReady: boolean;
}

/** Клік по ворогу в списку — атака тією ж зброєю, що й на карті; null — лише вибір. */
export function participantAttackIntent({ battle, turn: { current, isMyTurn }, anyPending, attackReady }: ParticipantClickScene, targetId: string): AttackIntent | null {
  if (!isMyTurn || anyPending || !attackReady || !canStartAttack(current)) return null;

  const order = (battle.initiativeOrder ?? []).filter((p) => !p.battleData.reserved);

  const target = order.find((p) => p.basicInfo.id === targetId);

  if (!target || target.basicInfo.side === current.basicInfo.side || !isTargetable(target)) return null;

  const { attack } = pickAttack(battle.map ?? null, order, current, current.battleData.attacks, target);

  return attack ? { targetId, attackId: attack.id ?? attack.name, actorId: current.basicInfo.id, round: battle.currentRound, turnIndex: battle.currentTurnIndex } : null;
}
