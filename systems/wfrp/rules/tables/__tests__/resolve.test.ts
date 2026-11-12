import { describe, expect, it } from 'vitest';

import { DEFAULT_TABLES } from '../defaults';
import { resolveTable, rollSlot } from '../resolve';

import {
    TABLE_SLOTS,
    type TableRow,
    TablesRulesSchema,
} from '@/systems/wfrp/rules/tables/schema';

describe('DEFAULT_TABLES', () => {
    it('every slot passes TablesRulesSchema', () => {
        for (const slot of TABLE_SLOTS) {
            const rows = DEFAULT_TABLES[slot].map(
                ({ textKey: _t, ...row }) => row
            );

            expect(TablesRulesSchema.safeParse({ [slot]: rows }).success).toBe(
                true
            );
        }
    });

    it('keeps the shipped row counts', () => {
        expect(TABLE_SLOTS.map((slot) => DEFAULT_TABLES[slot].length)).toEqual(
            TABLE_SLOTS.map((slot) =>
                slot === 'wrath'
                    ? 4
                    : slot === 'downtimeEvent'
                      ? 10
                      : slot.startsWith('mutation')
                        ? 6
                        : 5
            )
        );
    });

    it('uses legacy text keys', () => {
        expect(DEFAULT_TABLES.critLeg[2].textKey).toBe('battleWfrp.crit.leg.3');
        expect(DEFAULT_TABLES.miscastMajor[0].textKey).toBe(
            'wfrpMagic.miscast.major.1'
        );
        expect(DEFAULT_TABLES.wrath[3].textKey).toBe(
            'wfrpMagic.miscast.wrath.4'
        );
    });
});

describe.each([
    ['physical', 'mutationPhysical'],
    ['mental', 'mutationMental'],
] as const)('default %s mutations', (kind, slot) => {
    const rows = DEFAULT_TABLES[slot];

    it('has 6 strictly increasing rows ending at 100 that pass the slot schema', () => {
        expect(rows).toHaveLength(6);
        expect(rows[5].max).toBe(100);
        expect(rows.every((r, i) => i === 0 || r.max > rows[i - 1].max)).toBe(
            true
        );
        expect(
            TablesRulesSchema.safeParse({
                [slot]: rows.map(({ textKey: _k, ...r }) => r),
            }).success
        ).toBe(true);
    });

    it('uses wfrpCorruption text keys', () => {
        expect(rows.map((r) => r.textKey)).toEqual(
            [1, 2, 3, 4, 5, 6].map(
                (n) => `wfrpCorruption.mutations.${kind}.${n}`
            )
        );
    });
});

it('rollSlot picks mutation row 3 for a roll of 40', () => {
    expect(
        rollSlot({ tables: {} }, 'mutationMental', () => 0.5, 40).index
    ).toBe(2);
});

describe('resolveTable', () => {
    const rows: TableRow[] = [{ max: 100, effects: [] }];

    it('returns campaign rows only for the overridden slot', () => {
        const rules = { tables: { critHead: rows } };

        expect(resolveTable(rules, 'critHead')).toBe(rows);
        expect(resolveTable(rules, 'critArm')).toBe(DEFAULT_TABLES.critArm);
    });

    it('null falls back to defaults', () => {
        expect(resolveTable({ tables: { critHead: null } }, 'critHead')).toBe(
            DEFAULT_TABLES.critHead
        );
    });
});
