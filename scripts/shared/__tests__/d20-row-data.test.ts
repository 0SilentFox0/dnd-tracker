import { describe, expect, it } from 'vitest';

import { d20RowData } from '../d20-row-data';

describe('d20RowData', () => {
    it('dual-writes the statblock into characteristics and the columns', () => {
        expect(
            d20RowData({ name: 'x', strength: 14, armorClass: 15 })
        ).toEqual({
            name: 'x',
            strength: 14,
            armorClass: 15,
            characteristics: { strength: 14, armorClass: 15 },
        });
    });

    it('merges into the previous characteristics', () => {
        expect(
            d20RowData({ initiative: 3 }, { speed: 25, initiative: 1 })
                .characteristics
        ).toEqual({ speed: 25, initiative: 3 });
    });

    it('leaves the data untouched without a statblock column', () => {
        const data = { name: 'x' };

        expect(d20RowData(data)).toEqual(data);
    });
});
