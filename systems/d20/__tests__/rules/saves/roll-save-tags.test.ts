import { describe, expect, it } from 'vitest';

import {
    makeEffect,
    makeParticipant,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { SpellResolutionSchema } from '@/lib/utils/spells/model/schema';
import { rollSave } from '@/systems/d20/rules/saves/roll-save';
import type { BattleParticipant } from '@/types/battle';

const wearer = (): BattleParticipant => {
    const p = makeParticipant({ id: 't' });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            activeEffects: [
                makeEffect('e', {
                    abilityEffects: [
                        {
                            kind: 'flag',
                            flag: 'saveAdvantage',
                            abilities: 'all',
                            vsTags: ['breath'],
                            vsCreatureTypes: ['dragon'],
                        },
                    ],
                }),
            ],
        },
    };
};

const modeVs = (source?: Parameters<typeof rollSave>[0]['source']) => {
    const t = wearer();

    return rollSave({
        target: t,
        ability: 'dexterity',
        dc: 12,
        participants: [t],
        rules: DEFAULT_RULES,
        rng: seq(0.5, 0.7),
        vsSpell: true,
        source,
    }).mode;
};

describe('save source tags', () => {
    it('advantage against a dragon breath', () => {
        expect(modeVs({ tags: ['breath'], creatureType: 'Dragon' })).toBe(
            'advantage'
        );
    });

    it('normal against a breath of another creature type', () => {
        expect(modeVs({ tags: ['breath'], creatureType: 'humanoid' })).toBe(
            'normal'
        );
    });

    it('normal against a dragon non-breath save', () => {
        expect(modeVs({ creatureType: 'dragon' })).toBe('normal');
    });

    it('normal without a source', () => {
        expect(modeVs()).toBe('normal');
    });
});

describe('spell resolution tags', () => {
    it('accepts the breath tag on a save and rejects unknown tags', () => {
        const save = { kind: 'save', ability: 'dexterity', onSuccess: 'half' };

        expect(
            SpellResolutionSchema.safeParse({ ...save, tags: ['breath'] })
                .success
        ).toBe(true);
        expect(
            SpellResolutionSchema.safeParse({ ...save, tags: ['gaze'] }).success
        ).toBe(false);
    });
});
