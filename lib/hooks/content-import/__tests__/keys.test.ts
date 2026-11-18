import { describe, expect, it } from 'vitest';

import { contentImportKeys,importInvalidateKeys } from '../keys';

import { artifactSetKeys } from '@/systems/artifactsets/hooks/keys';
import type { ImportKind } from '@/types/content-import';

const C = 'C';

const FROZEN: Record<ImportKind, unknown[]> = {
    units: [['units', C], ['battle-balance', C]],
    spells: [['spells', C]],
    skills: [['skills', C]],
    'main-skills': [['main-skills', C], ['skills', C]],
    'spell-groups': [['spell-groups', C], ['spells', C]],
    races: [['races', C], ['units', C]],
    classes: [['classes', C]],
    feats: [['feats', C]],
    backgrounds: [['backgrounds', C]],
    careers: [['careers', C]],
    artifacts: [['artifacts', C], ['artifact-sets', C]],
    'artifact-sets': [['artifact-sets', C], ['artifacts', C]],
};

describe('importInvalidateKeys', () => {
    it.each(Object.keys(FROZEN) as ImportKind[])(
        '%s keeps the pre-W10 key set',
        (kind) => {
            expect(importInvalidateKeys(C, kind)).toEqual(FROZEN[kind]);
        }
    );

    it('artifact set list key equals the import fallback list', () => {
        expect(artifactSetKeys.list(C)).toEqual(
            contentImportKeys.fallbackList(C, 'artifact-sets')
        );
    });
});
