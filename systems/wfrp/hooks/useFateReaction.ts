'use client';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';
import { fateReactionOp } from '@/systems/wfrp/api/battle';
import { TRAP_BLADE_COST } from '@/systems/wfrp/rules/combat/trap-blade';

export interface FateReactionRow {
    key: string;
    holderName: string;
    attackerName: string;
    trapBlade: boolean;
}

export function useFateReaction() {
    const { battle, viewer, actions } = useBattleScene();

    const pending = asShownCrit(battle.pendingChoice);

    const offers = pending?.negations ?? [];

    const byId = new Map(
        battle.initiativeOrder.map((p) => [p.basicInfo.id, p])
    );

    const nameOf = (id: string) => byId.get(id)?.basicInfo.name ?? '';

    const holds = (id: string) =>
        viewer.isDM ||
        (!!viewer.userId &&
            byId.get(id)?.basicInfo.controlledBy === viewer.userId);

    const waiting = offers.length > 0 && pending?.triggers.length === 0;

    const mine = offers.every((o) => holds(o.holderId));

    const rows: FateReactionRow[] = offers.map((o) => ({
        key: o.key,
        holderName: nameOf(o.holderId),
        attackerName: nameOf(o.actorId),
        trapBlade: o.cost === TRAP_BLADE_COST,
    }));

    return {
        open: waiting && mine,
        waiting: waiting && !mine && !viewer.isDM,
        rows,
        answer: (answers: Record<string, boolean>) =>
            actions.system.mutate(fateReactionOp(answers)),
        isSubmitting: isSystemActionPending(actions.system, 'fate-reaction'),
    };
}
