import {
    collectModifiers,
    statWithModifiers,
} from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { BattleParticipant } from '@/types/battle';

export function getEffectiveArmorClass(
    p: BattleParticipant,
    participants: BattleParticipant[] = [p],
    extra?: StaticEffect[]
): number {
    return statWithModifiers(
        withSelf(participants, p),
        p.basicInfo.id,
        'armor',
        p.combatStats.armorClass,
        { extra }
    );
}

export function applyMainActionUsed(
    participant: BattleParticipant
): BattleParticipant {
    const pending = participant.battleData.pendingExtraActions ?? 0;

    if (pending > 0) {
        return {
            ...participant,
            battleData: {
                ...participant.battleData,
                pendingExtraActions: pending - 1,
            },
            actionFlags: { ...participant.actionFlags, hasUsedAction: false },
        };
    }

    return {
        ...participant,
        actionFlags: { ...participant.actionFlags, hasUsedAction: true },
    };
}

export function grantExtraActions(
    participant: BattleParticipant,
    n: number
): BattleParticipant {
    if (n <= 0) return participant;

    const used = participant.actionFlags.hasUsedAction;

    const toPool = used ? n - 1 : n;

    return {
        ...participant,
        actionFlags: { ...participant.actionFlags, hasUsedAction: false },
        battleData:
            toPool > 0
                ? {
                      ...participant.battleData,
                      pendingExtraActions:
                          (participant.battleData.pendingExtraActions ?? 0) +
                          toPool,
                  }
                : participant.battleData,
    };
}

export function setExtraActionPool(
    participant: BattleParticipant,
    n: number
): BattleParticipant {
    if ((participant.battleData.pendingExtraActions ?? 0) === n)
        return participant;

    return {
        ...participant,
        battleData: { ...participant.battleData, pendingExtraActions: n },
    };
}

export function actionsPerTurnPool(
    participant: BattleParticipant,
    participants: BattleParticipant[]
): number {
    return Math.max(
        0,
        Math.floor(
            collectModifiers(
                withSelf(participants, participant),
                participant.basicInfo.id,
                { stat: 'actionsPerTurn' }
            ).flat
        )
    );
}
