import { describe, expect, it } from 'vitest';

import {
    generateInviteCode,
    INVITE_CODE_LENGTH,
} from '@/lib/utils/campaigns/invite-code';
import {
    inviteLinkPath,
    normalizeInviteCode,
} from '@/lib/utils/campaigns/invite-link';

describe('generateInviteCode', () => {
    it('is 6 chars without 0 O 1 I', () => {
        for (let i = 0; i < 1000; i++) {
            const code = generateInviteCode();

            expect(code).toHaveLength(INVITE_CODE_LENGTH);
            expect(code).toMatch(/^[2-9A-HJKLMNP-Z]+$/);
        }
    });
});

describe('normalizeInviteCode', () => {
    it('trims and uppercases', () => {
        expect(normalizeInviteCode(' ab3k9z ')).toBe('AB3K9Z');
    });
});

describe('inviteLinkPath', () => {
    it('builds the join path', () => {
        expect(inviteLinkPath('AB3K9Z')).toBe('/join/AB3K9Z');
    });
});
