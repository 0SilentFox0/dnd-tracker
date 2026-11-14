import { textRef } from '@/lib/i18n/text-ref';
import {
    type TimedEffectInput,
    upsertTimedEffect,
} from '@/lib/utils/abilities/engine/effects/timed-effects';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export type LabeledEffectInput = TimedEffectInput & { label?: LogLine };

/** Like `upsertTimedEffect`, plus the display label of the effect (its `name` stays a stable technical string). */
export function upsertLabeled(
    p: BattleParticipant,
    input: LabeledEffectInput,
    round: number
): BattleParticipant {
    const { label, ...timed } = input;

    const next = upsertTimedEffect(p, timed, round);

    if (!label) return next;

    return {
        ...next,
        battleData: {
            ...next.battleData,
            activeEffects: next.battleData.activeEffects.map((e) =>
                e.abilityKey === input.timedKey ? { ...e, label } : e
            ),
        },
    };
}

const flag = (f: Record<string, unknown>) =>
    ({ kind: 'flag', ...f }) as StaticEffect;

export const coreTimedKey = (action: string, participantId: string) =>
    `core:${action}:${participantId}`;

export function helpEffect(helperId: string): LabeledEffectInput {
    return {
        timedKey: coreTimedKey('help', helperId),
        name: 'Help',
        label: textRef('battleCommon.coreActions.help'),
        type: 'buff',
        rounds: 1,
        stackable: false,
        abilityEffects: [flag({ flag: 'advantage', attackKind: 'all' })],
        consumeOn: 'ownAttack',
    };
}
