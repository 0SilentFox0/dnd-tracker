import { describe, expect, it } from 'vitest';

import { d20MaxHp } from '@/systems/d20/rules/progression/max-hp';
import type { ResolvedClassEntry } from '@/types/classes';

const entry = (withClass: boolean): ResolvedClassEntry => ({
    classId: 'c',
    level: 2,
    class: withClass ? ({ hitDie: 8 } as ResolvedClassEntry['class']) : null,
    subclass: null,
});

const run = (entries: ResolvedClassEntry[] | null) =>
    d20MaxHp({
        character: { level: 2, constitution: 10 },
        entries,
        characteristics: null,
        rules: {} as never,
    });

describe('d20MaxHp', () => {
    it('with classes: class HP and the hit dice line', () => {
        const hp = run([entry(true)]);

        expect(hp.total).toBe(8 + 5);
        expect(hp.breakdown).toHaveLength(1);
    });

    it('without classes: 1', () =>
        expect(run(null)).toEqual({ total: 1, breakdown: [] }));

    it('entries without a class: 1', () =>
        expect(run([entry(false)])).toEqual({ total: 1, breakdown: [] }));
});
