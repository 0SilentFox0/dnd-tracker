import { describe, expect, it } from 'vitest';

import { OwnerKind } from '@/lib/utils/abilities/read';
import { ITEM_SET_KEY } from '@/lib/utils/artifacts/item-set-key';

describe('module-derived keys', () => {
    it('keeps the stored item-set id', () => {
        expect(ITEM_SET_KEY).toBe('artifactSet');
    });

    it('OwnerKind lists core kinds and module sources', () => {
        expect(Object.values(OwnerKind).sort()).toEqual(
            [
                'artifact',
                'artifactSet',
                'class',
                'feat',
                'race',
                'skill',
                'unit',
            ].sort()
        );
    });
});
