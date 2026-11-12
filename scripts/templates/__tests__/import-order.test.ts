import { describe, expect, it } from 'vitest';

import { importOrder } from '../lib/import-order';

describe('importOrder', () => {
    it('puts a kind after the kinds it links to, keeping the given order otherwise', () => {
        expect(
            importOrder(['units', 'spells', 'spell-groups', 'races'])
        ).toEqual(['spell-groups', 'spells', 'races', 'units']);
    });

    it('does not cycle on artifacts and artifact-sets: sets come after artifacts', () => {
        expect(importOrder(['artifact-sets', 'artifacts'])).toEqual([
            'artifacts',
            'artifact-sets',
        ]);
    });

    it('ignores links to kinds the pack does not have', () => {
        expect(importOrder(['units', 'feats'])).toEqual(['units', 'feats']);
    });

    it('keeps kinds the importer does not know at the end', () => {
        expect(
            importOrder(['tracks', 'skills', 'skillTrees', 'units'])
        ).toEqual(['skills', 'units', 'tracks', 'skillTrees']);
    });
});
