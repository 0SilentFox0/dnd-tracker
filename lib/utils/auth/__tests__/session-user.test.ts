import { describe, expect, it } from 'vitest';

import { toSessionUser } from '@/lib/utils/auth/session-user';

const base = { id: 'u1', email: 'a@b.c' };

describe('toSessionUser', () => {
    it('returns null without a user', () =>
        expect(toSessionUser(null)).toBeNull());

    it('prefers custom_avatar_url over Google photo', () => {
        const u = toSessionUser({
            ...base,
            user_metadata: {
                custom_avatar_url: 'https://x.supabase.co/own.webp',
                avatar_url: 'https://lh3.googleusercontent.com/g',
            },
        });

        expect(u?.avatarUrl).toBe('https://x.supabase.co/own.webp');
    });

    it('falls back to avatar_url, then picture, then null', () => {
        expect(
            toSessionUser({
                ...base,
                user_metadata: { avatar_url: 'https://g/1' },
            })?.avatarUrl
        ).toBe('https://g/1');
        expect(
            toSessionUser({
                ...base,
                user_metadata: { picture: 'https://g/2' },
            })?.avatarUrl
        ).toBe('https://g/2');
        expect(toSessionUser(base)?.avatarUrl).toBeNull();
    });

    it('treats custom_avatar_url null (removed) as absent and ignores non-https', () => {
        expect(
            toSessionUser({
                ...base,
                user_metadata: {
                    custom_avatar_url: null,
                    avatar_url: 'https://g/1',
                },
            })?.avatarUrl
        ).toBe('https://g/1');
        expect(
            toSessionUser({
                ...base,
                user_metadata: { custom_avatar_url: 'javascript:alert(1)' },
            })?.avatarUrl
        ).toBeNull();
    });

    it('reads name from full_name then name', () => {
        expect(
            toSessionUser({ ...base, user_metadata: { full_name: 'F N' } })
                ?.name
        ).toBe('F N');
        expect(
            toSessionUser({ ...base, user_metadata: { name: 'N' } })?.name
        ).toBe('N');
    });
});
