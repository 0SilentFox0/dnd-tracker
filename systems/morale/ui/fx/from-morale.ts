import type { SystemDice, SystemDiceSource } from '@/lib/utils/battle/fx';
import type { PendingMoraleCheckPayload } from '@/lib/utils/battle/turn';
import { moraleDiceDone } from '@/systems/morale/hooks/morale-dice';

export function moraleThrowOf(input: {
    round: number;
    turnIndex: number;
    pending: { participantId: string; d10Roll: number } | null;
    visible: boolean;
}): SystemDice | null {
    const { round, turnIndex, pending, visible } = input;

    if (!pending || !visible) return null;

    const key = `${round}:${turnIndex}:${pending.participantId}:${pending.d10Roll}`;

    let seed = 7;

    for (let i = 0; i < key.length; i++)
        seed = (Math.imul(seed, 31) + key.charCodeAt(i)) | 0;

    return {
        key: `morale:${key}`,
        actorId: pending.participantId,
        spec: {
            seed: Math.abs(seed),
            groups: [[{ sides: 10, value: pending.d10Roll }]],
        },
        onDone: moraleDiceDone,
    };
}

export const moraleDiceSource: SystemDiceSource = (event) => {
    const pending = event.scene
        .pendingCheck as PendingMoraleCheckPayload | null;

    const who = pending
        ? event.participants.find((p) => p.basicInfo.id === pending.participantId)
        : undefined;

    return moraleThrowOf({
        round: event.round,
        turnIndex: event.turnIndex,
        pending,
        visible: !!who && event.visible(who),
    });
};
