import { describe, expect, it } from 'vitest';

import { PROFILE_MENU } from '@/components/layout/profile-menu';

describe('PROFILE_MENU', () => {
    it('has unique ids in the expected order', () => {
        expect(PROFILE_MENU.map((e) => e.id)).toEqual([
            'help',
            'password',
            'preferences',
            'soundLibrary',
            'aiKeys',
            'switchAccount',
            'signOut',
        ]);
    });

    it('gives every entry exactly one of href/action', () => {
        for (const e of PROFILE_MENU)
            expect('href' in e !== 'action' in e).toBe(true);
    });

    it('keeps hrefs absolute', () => {
        for (const e of PROFILE_MENU)
            if ('href' in e) expect(e.href.startsWith('/')).toBe(true);
    });
});
