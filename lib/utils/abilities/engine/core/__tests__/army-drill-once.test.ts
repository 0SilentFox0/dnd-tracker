import { describe, expect, it } from 'vitest';

import { RACE_PASSIVES } from '@/data/library/race-passives';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import type { Ability } from '@/lib/utils/abilities/schema';
import { DEFAULT_RULES } from '@/lib/utils/rules';

describe('Вишкіл війська', () => {
    it('дає +1 до моралі раз на сторону, а не на кожного юніта раси', () => {
        const drill = RACE_PASSIVES.humans.trait[0] as Ability;

        const ps = ['a', 'b', 'c'].map((id) =>
            makeParticipant({
                id,
                abilities: [resolved(drill, { type: 'race', id: 'humans' })],
            })
        );

        const { participants, messages } = runAbilities(
            ps,
            { type: 'battleStart' },
            { rules: DEFAULT_RULES, round: 1, rng: seq(0.5) }
        );

        expect(messages).toHaveLength(1);

        for (const p of participants)
            expect(
                collectModifiers(participants, p.basicInfo.id, {
                    stat: 'morale',
                }).flat
            ).toBe(1);
    });
});
