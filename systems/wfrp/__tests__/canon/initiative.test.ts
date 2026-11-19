import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { compareInitiative } from '@/lib/utils/battle/turn/initiative';
import { wfrpInitiative } from '@/systems/wfrp/rules/combat/initiative';
import type { BattleParticipant } from '@/types/battle';

const fighter = (i: number): BattleParticipant =>
    ({ abilities: { baseInitiative: i, initiative: 0 } }) as BattleParticipant;

const score = (i: number, die: number, edition: 'canon5e' | 'legacy') =>
    wfrpInitiative(fighter(i), {
        rules: {
            initiative: { mode: 'roll' },
            edition: { preset: edition },
        } as never,
        rng: () => (die - 0.5) / 10,
    });

describe('canon: Combat Initiative (p161)', () => {
    bookExample(
        161,
        'Tollich (I 38) rolling 5 totals 8, Perdita (I 43) rolling 6 totals 10',
        () => {
            expect(score(38, 5, 'canon5e').total).toBe(8);
            expect(score(43, 6, 'canon5e').total).toBe(10);
        }
    );

    bookExample(161, 'on equal totals the higher Initiative acts first', () => {
        const tollich = fighter(38);

        const cultist = fighter(35);

        tollich.abilities.initiative = 8;
        cultist.abilities.initiative = 8;

        expect(compareInitiative(tollich, cultist, {} as never)).toBeLessThan(
            0
        );
    });

    bookExample(161, 'legacy preset keeps the full I + d10', () => {
        expect(score(38, 5, 'legacy').total).toBe(43);
        expect(LEGACY.initiativeBase).toBe('full');
        expect(CANON.initiativeRolled).toBe(true);
    });
});
