import { describe, expect, it } from 'vitest';

import { dispelMutation, dispelSchema } from '../battle/dispel-mutation';
import { malignantMutation } from '../battle/malignant-mutation';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'canon5e' | 'legacy') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const chars = slotOf({
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, int: 60, wp: 40 },
    skillAdvances: { 'language:magick': 10 },
});

const hero = (): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    return { ...base, abilities: { ...base.abilities, system: chars } };
};

const foe = (): BattleParticipant =>
    withWfrpState(
        participant('foe', {
            side: ParticipantSide.ENEMY,
            controlledBy: 'dm',
        }),
        { lastCast: { spell: 'Bolt', sl: 1 } }
    );

const ctxOf = (
    participants: BattleParticipant[],
    preset: 'canon5e' | 'legacy' = 'canon5e'
) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules: rulesOf(preset) } };
};

const body = {
    participantId: 'hero',
    targetId: 'foe',
    mode: 'persistent',
} as const;

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

describe('Dispel action', () => {
    it('reactive mode is gone: a reactive Dispel is an offer in the cast window', () => {
        expect(
            dispelSchema.safeParse({ ...body, mode: 'reactive' }).success
        ).toBe(false);
    });

    it('a persistent attempt needs a held spell with a CN', () => {
        expect(() =>
            dispelMutation(ctxOf([hero(), foe()]), { ...body, roll: 10 })
        ).toThrow('errors.dispelNoTarget');
    });

    it('is unavailable outside canon5e', () => {
        expect(() =>
            dispelMutation(ctxOf([hero(), foe()], 'legacy'), {
                ...body,
                roll: 10,
            })
        ).toThrow();
    });
});

describe('Malignant Influence toggle', () => {
    it('sets and clears the flag', () => {
        const on = malignantMutation(ctxOf([hero()]), {
            participantId: 'hero',
            on: true,
        });

        expect(wfrpState(find(on, 'hero')).malignant).toBe(true);

        const off = malignantMutation(ctxOf(on.participants), {
            participantId: 'hero',
            on: false,
        });

        expect(wfrpState(find(off, 'hero')).malignant).toBeUndefined();
    });
});
