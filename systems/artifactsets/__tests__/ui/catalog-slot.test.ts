import { describe, expect, it } from 'vitest';

import { systemUiOf } from '@/components/systems/registry';

describe('artifactsets catalog slot', () => {
    it('present with the module and on homm, absent on bare dnd5e', () => {
        expect(systemUiOf('homm').itemGroups?.Panel).toBeTypeOf('function');
        expect(
            systemUiOf('dnd5e', ['artifactsets']).itemGroups?.Link
        ).toBeTypeOf('function');
        expect(systemUiOf('dnd5e', []).itemGroups).toBeUndefined();
    });
});
