import {
    findParticipant,
    isAttackable,
} from '@/lib/utils/abilities/engine/core/participants';
import { pickAttack } from '@/lib/utils/battle/grid/attack-reach';
import { canStartAttack } from '@/lib/utils/battle/grid/map-scene';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleScene } from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

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
    attackLeft?: boolean;
}

export function turnAllowsAttack({
    phase,
    actionUsed,
    skipped,
    attackLeft,
}: TurnAttackStatus): boolean {
    return phase === 'acting' && (!actionUsed || !!attackLeft) && !skipped;
}

export function canConsumeIntent(
    intent: AttackIntent,
    turn: TurnPoint & TurnAttackStatus & { heroId: string }
): boolean {
    return (
        !isIntentStale(intent, turn) &&
        intent.actorId === turn.heroId &&
        turnAllowsAttack(turn)
    );
}

export interface ParticipantClickScene {
    battle: Pick<
        BattleScene,
        | 'map'
        | 'rules'
        | 'initiativeOrder'
        | 'currentRound'
        | 'currentTurnIndex'
    >;
    turn: { current: BattleParticipant | null; isMyTurn: boolean };
    anyPending: boolean;
    attackReady: boolean;
}

export type AttackIntentResult = { intent: AttackIntent } | { reason: LogLine };

export interface QuickAttackContext {
    maxTargets: number;
    hitsAllEnemies: boolean;
    systemInput: boolean;
}

export function quickAttackAllowed({
    maxTargets,
    hitsAllEnemies,
    systemInput,
}: QuickAttackContext): boolean {
    return maxTargets <= 1 && !hitsAllEnemies && !systemInput;
}

export function participantAttackIntent(
    {
        battle,
        turn: { current, isMyTurn },
        anyPending,
        attackReady,
    }: ParticipantClickScene,
    targetId: string
): AttackIntentResult | null {
    if (!isMyTurn || anyPending || !attackReady || !canStartAttack(current))
        return null;

    const order = (battle.initiativeOrder ?? []).filter(
        (p) => !p.battleData.reserved
    );

    const target = findParticipant(order, targetId);

    if (
        !target ||
        !isHostile(battle.map ?? null, current, target) ||
        !isAttackable(target)
    )
        return null;

    const { attack, error } = pickAttack(
        battle.map ?? null,
        order,
        current,
        current.battleData.attacks,
        target,
        battle.rules
    );

    if (!attack) return error ? { reason: error } : null;

    return {
        intent: {
            targetId,
            attackId: attack.id ?? attack.name,
            actorId: current.basicInfo.id,
            round: battle.currentRound,
            turnIndex: battle.currentTurnIndex,
        },
    };
}
