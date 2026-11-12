import { describe, expect, it } from 'vitest';

import { foreignColumnsOf, statColumnFillOf, statColumnsOf } from '../stats';
import type { RuleSystemDefinition } from '../types';

import { CHARACTER_SYSTEM_COLUMNS } from '@/lib/constants/stat-columns';
import { parseRules } from '@/lib/utils/rules/schema';

const def = (columns?: NonNullable<RuleSystemDefinition['stats']>['columns']) =>
    ({
        key: 't',
        stats: columns && { columns },
    }) as unknown as RuleSystemDefinition;

describe('stat columns helpers', () => {
    it('owned columns are the union of parts', () => {
        const d = def([
            { owns: ['strength'] },
            { owns: ['level', 'strength'] },
        ]);

        expect([...statColumnsOf(d)].sort()).toEqual(['level', 'strength']);
    });

    it('foreign columns are everything not owned', () => {
        const d = def([{ owns: CHARACTER_SYSTEM_COLUMNS }]);

        expect(foreignColumnsOf(d)).toEqual([]);
        expect(foreignColumnsOf(def([{ owns: ['level'] }]))).not.toContain(
            'level'
        );
        expect(foreignColumnsOf(def())).toEqual([...CHARACTER_SYSTEM_COLUMNS]);
    });

    it('fill merges parts and is empty without hooks', () => {
        const rules = parseRules({});

        expect(statColumnFillOf(def([{ owns: [] }]), rules)).toEqual({});
        expect(
            statColumnFillOf(
                def([
                    { owns: [], fill: () => ({ level: 1 }) },
                    { owns: [], fill: () => ({ speed: 30 }) },
                ]),
                rules
            )
        ).toEqual({ level: 1, speed: 30 });
    });
});
