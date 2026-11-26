import { describe, expect, it } from 'vitest';

import { groupSectionKeys } from '../section-groups';
import { sectionsOfComposition } from '../section-registry';
import type { RulesSection, SectionMap } from '../sections';

const section = (group?: RulesSection['group']): RulesSection => ({
    owner: 'core',
    mechanic: true,
    items: {},
    group,
});

describe('groupSectionKeys', () => {
    const sections: SectionMap = {
        a: section('world'),
        b: section('combat'),
        c: section(),
        d: section('combat'),
    };

    it('orders groups, keeps key order, puts ungrouped under other', () => {
        expect(groupSectionKeys(['a', 'b', 'c', 'd'], sections)).toEqual([
            { group: 'combat', keys: ['b', 'd'] },
            { group: 'world', keys: ['a'] },
            { group: 'other', keys: ['c'] },
        ]);
    });

    it('drops empty groups', () => {
        expect(groupSectionKeys(['a'], sections)).toEqual([
            { group: 'world', keys: ['a'] },
        ]);
    });

    it('treats a key missing from the map as other', () => {
        expect(groupSectionKeys(['zzz'], sections)).toEqual([
            { group: 'other', keys: ['zzz'] },
        ]);
    });

    it('leaves no mechanic section of the d20 composition ungrouped', () => {
        const active = sectionsOfComposition({
            base: 'd20',
            modules: ['morale', 'deathsaves', 'heroscaling'],
        } as never);

        const mechanic = Object.keys(active).filter((k) => active[k].mechanic);

        const other = groupSectionKeys(mechanic, active).find(
            (g) => g.group === 'other'
        );

        expect(other).toBeUndefined();
    });
});
