import { describe, expect, it } from 'vitest';

import { defaultSpellForm } from '@/lib/utils/spells/model/form';

describe('defaultSpellForm', () => {
    it('starts with mechanics unverified (manual execution)', () => {
        expect(defaultSpellForm().executionMode).toBe('manual');
    });
});
