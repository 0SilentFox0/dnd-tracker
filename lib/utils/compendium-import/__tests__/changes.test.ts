import { describe, expect, it } from 'vitest';

import { changesByKind } from '../changes';

import type { CompendiumReport } from '@/types/compendium-import';

const row = (kind: string, status: string) =>
    ({ kind, status }) as unknown as CompendiumReport['rows'][number];

describe('changesByKind', () => {
    it('counts created, updated and unchanged rows per kind', () => {
        expect(
            changesByKind([
                row('spells', 'create'),
                row('spells', 'update'),
                row('spells', 'unchanged'),
                row('feats', 'create'),
            ])
        ).toEqual([
            { kind: 'spells', created: 1, updated: 1, unchanged: 1 },
            { kind: 'feats', created: 1, updated: 0, unchanged: 0 },
        ]);
    });
});
