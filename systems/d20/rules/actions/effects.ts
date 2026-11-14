import { EffectMarker } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import {
    coreTimedKey,
    type LabeledEffectInput,
} from '@/lib/utils/battle/actions/effects';

const flag = (f: Record<string, unknown>) =>
    ({ kind: 'flag', ...f }) as StaticEffect;

export const DODGE_KEY_PREFIX = 'core:dodge:';

export function disengageEffect(participantId: string): LabeledEffectInput {
    return {
        timedKey: coreTimedKey('disengage', participantId),
        name: 'Disengage',
        label: textRef('battleCommon.coreActions.disengage'),
        type: 'buff',
        rounds: 1,
        stackable: false,
        effects: [{ type: EffectMarker.DISENGAGED, value: 1 }],
        until: 'turnEnd',
    };
}

export function dodgeEffect(participantId: string): LabeledEffectInput {
    return {
        timedKey: coreTimedKey('dodge', participantId),
        name: 'Dodge',
        label: textRef('battleCommon.coreActions.dodge'),
        type: 'buff',
        rounds: 1,
        stackable: false,
        abilityEffects: [
            flag({ flag: 'disadvantageForAttackers' }),
            flag({ flag: 'saveAdvantage', abilities: ['dexterity'] }),
        ],
        until: 'nextTurnStart',
    };
}

export function hiddenEffect(participantId: string): LabeledEffectInput {
    return {
        timedKey: coreTimedKey('hide', participantId),
        name: 'Hidden',
        label: textRef('battleActions.effects.hidden'),
        type: 'buff',
        rounds: 10,
        stackable: false,
        effects: [{ type: EffectMarker.HIDDEN, value: 1 }],
        abilityEffects: [
            flag({ flag: 'advantage', attackKind: 'all' }),
            flag({ flag: 'disadvantageForAttackers' }),
        ],
        consumeOn: 'ownAttack',
    };
}
