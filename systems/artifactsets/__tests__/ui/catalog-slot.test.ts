import { describe, expect, it } from 'vitest';

import { systemUiOf } from '@/components/systems';

describe('artifactsets catalog slot', () => {
    it('present with the module and on homm, absent on bare dnd5e', () => {
        expect(systemUiOf('homm').artifactSets?.Panel).toBeTypeOf('function');
        expect(
            systemUiOf('dnd5e', ['artifactsets']).artifactSets?.Link
        ).toBeTypeOf('function');
        expect(systemUiOf('dnd5e', []).artifactSets).toBeUndefined();
    });
});
