import { describe, expect, it } from 'vitest';

import { BUNDLE_TABLES } from '@/lib/server/templates/bundle';
import {
    classifyLayered,
    type LayeredEntry,
} from '@/lib/server/templates/sync/layered';
import { emptyState } from '@/lib/server/templates/sync/state';

const table = (key: string) => BUNDLE_TABLES.find((t) => t.key === key)!;

describe('classifyLayered requires', () => {
    it('a changed spell requires the new unit it summons', () => {
        const entries: LayeredEntry[] = [
            {
                t: table('units'),
                key: 'u1',
                source: { id: 'u1', name: 'U' },
                hidden: false,
            },
            {
                t: table('spells'),
                key: 's1',
                source: { id: 's1', name: 'S', summonUnitId: 'u1' },
                baseline: { id: 's1', name: 'S' },
                hidden: false,
            },
        ];

        const items = classifyLayered({ entries, ignored: emptyState() });

        const spell = items.find((i) => i.key === 's1')!;

        expect(spell.status).toBe('updated');
        expect(spell.requires).toEqual([
            { scope: 'units', key: 'u1', name: 'U' },
        ]);
        expect(items.find((i) => i.key === 'u1')!.requires).toEqual([]);
    });
});
