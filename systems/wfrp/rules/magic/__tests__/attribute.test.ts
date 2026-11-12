import { describe, expect, it } from 'vitest';

import { conditionLevel } from '../../conditions/levels';
import { wfrpLoreAttribute } from '../attribute';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';

const magic = (condition: string): SpellMagic => ({
    cn: 4,
    kind: 'arcane',
    overcast: null,
    attribute: { condition, levels: 1 },
});

const ps = [
    makeParticipant({ id: 'a' }),
    makeParticipant({ id: 'b' }),
    makeParticipant({ id: 'c' }),
];

describe('wfrpLoreAttribute', () => {
    it('applies the condition to every listed target', () => {
        const r = wfrpLoreAttribute(ps, ['a', 'b'], magic('ablaze'), 1);

        expect(r.participants.map((p) => conditionLevel(p, 'ablaze'))).toEqual([
            1, 1, 0,
        ]);
        expect(r.messages).toHaveLength(2);
        expect(
            r.messages.every(
                (m) =>
                    typeof m === 'object' &&
                    m.message === 'battleWfrp.log.applied'
            )
        ).toBe(true);
    });

    it('ignores an unknown key', () => {
        const r = wfrpLoreAttribute(ps, ['a'], magic('nonsense'), 1);

        expect(r.participants).toBe(ps);
        expect(r.messages).toEqual([]);
    });

    it('does nothing without an attribute', () => {
        const r = wfrpLoreAttribute(
            ps,
            ['a'],
            { cn: 4, kind: 'arcane', overcast: null },
            1
        );

        expect(r.participants).toBe(ps);
        expect(r.messages).toEqual([]);
    });
});
