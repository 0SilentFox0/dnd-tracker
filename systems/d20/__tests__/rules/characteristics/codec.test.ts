import { describe, expect, it } from 'vitest';

import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';
import { D20_MODULE } from '@/systems/d20';
import { D20_META } from '@/systems/d20/meta';
import {
    readD20Columns,
    writeD20Columns,
} from '@/systems/d20/rules/characteristics/codec';
import { D20_CHARACTERISTICS_COLUMNS } from '@/systems/d20/rules/characteristics/columns';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

const stats = {
    strength: 21,
    dexterity: 9,
    constitution: 15,
    intelligence: 18,
    wisdom: 15,
    charisma: 18,
    armorClass: 17,
    initiative: 7,
    speed: 10,
};

describe('d20 characteristics column view', () => {
    it('meta columns match the column view', () => {
        expect(D20_META.characteristicsColumns).toEqual(
            D20_MODULE.characteristics.columnView?.columns
        );
    });

    it('no other system uses these names as characteristics', () => {
        for (const m of SYSTEM_META.filter((m) => m.module !== 'd20'))
            expect(
                (m as { characteristicsColumns?: readonly string[] })
                    .characteristicsColumns ?? []
            ).toEqual([]);

        for (const k of Object.keys(DEFAULT_CHARACTERISTICS))
            expect(D20_CHARACTERISTICS_COLUMNS).not.toContain(k);
    });

    it('reads only characteristics, a missing key takes the column default', () => {
        expect(readD20Columns({ characteristics: stats })).toEqual(stats);
        expect(readD20Columns({ characteristics: null })).toEqual({
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
            armorClass: 10,
            initiative: 0,
            speed: 30,
        });
        expect(readD20Columns({ characteristics: { speed: 25 } })).toMatchObject(
            { speed: 25, strength: 10 }
        );
    });

    it('write merges into the previous value', () => {
        expect(writeD20Columns({ speed: 30 }, { speed: 10, other: 1 })).toEqual(
            {
                speed: 30,
                other: 1,
            }
        );
        expect(writeD20Columns({ armorClass: 12 }, null)).toEqual({
            armorClass: 12,
        });
    });
});
