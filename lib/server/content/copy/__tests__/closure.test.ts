import { describe, expect, it } from 'vitest';

import { selectClosure } from '@/lib/server/content/copy/closure';
import { emptyBundle } from '@/lib/server/templates/bundle';

const id = (c: string) => 'c' + c.repeat(24);

const [U, R, S, U2, A, SET, X, OTHER] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id);

describe('selectClosure', () => {
    it('follows ids inside JSON abilities', () => {
        const b = emptyBundle();

        b.units.push({ id: U, abilities: { race: R, list: [{ spell: S }] } });
        b.races.push({ id: R });
        b.spells.push({ id: S });

        const { rows } = selectClosure(b, [{ table: 'units', id: U }]);

        expect(rows.map((r) => r.row.id).sort()).toEqual([U, R, S].sort());
    });

    it('terminates on cycles', () => {
        const b = emptyBundle();

        b.spells.push({ id: S, summon: U2 });
        b.units.push({ id: U2, abilities: { spell: S } });

        const { rows } = selectClosure(b, [{ table: 'spells', id: S }]);

        expect(rows).toHaveLength(2);
    });

    it('leaves unrelated rows out', () => {
        const b = emptyBundle();

        b.units.push({ id: U });
        b.units.push({ id: OTHER });

        const { rows } = selectClosure(b, [{ table: 'units', id: U }]);

        expect(rows.map((r) => r.row.id)).toEqual([U]);
    });

    it('includes the set of an artifact through its FK', () => {
        const b = emptyBundle();

        b.artifacts.push({ id: A, setId: SET });
        b.artifactSets.push({ id: SET });

        const { rows } = selectClosure(b, [{ table: 'artifacts', id: A }]);

        expect(rows.map((r) => r.row.id).sort()).toEqual([A, SET].sort());
    });

    it('finds ids inside itemStats JSON strings', () => {
        const b = emptyBundle();

        b.units.push({
            id: U,
            abilities: {
                type: 'itemStats',
                value: JSON.stringify({ spell: S }),
            },
        });
        b.spells.push({ id: S });

        const { rows } = selectClosure(b, [{ table: 'units', id: U }]);

        expect(rows.map((r) => r.row.id).sort()).toEqual([U, S].sort());
    });

    it('reports references absent from the bundle', () => {
        const b = emptyBundle();

        b.units.push({ id: U, abilities: { race: X } });

        expect(selectClosure(b, [{ table: 'units', id: U }]).missing).toEqual([X]);
    });
});
