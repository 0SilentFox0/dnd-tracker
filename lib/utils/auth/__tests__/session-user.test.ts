import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toSessionUser } from '@/lib/utils/auth/session-user';

const base = { id: 'u1', email: 'a@b.c' };

const own = (path: string) =>
    `https://x.supabase.co/storage/v1/object/public/user-avatars/${path}`;

describe('toSessionUser', () => {
    beforeEach(() =>
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    );

    it('ignores a custom_avatar_url from a foreign host or bucket', () => {
        for (const custom of [
            'https://tracker.example/pixel',
            'https://x.supabase.co/storage/v1/object/public/other/u/a.webp',
        ])
            expect(
                toSessionUser({
                    ...base,
                    user_metadata: {
                        custom_avatar_url: custom,
                        avatar_url: 'https://g/1',
                    },
                })?.avatarUrl
            ).toBe('https://g/1');
    });

    it('returns null without a user', () =>
        expect(toSessionUser(null)).toBeNull());

    it('prefers custom_avatar_url over Google photo', () => {
        const u = toSessionUser({
            ...base,
            user_metadata: {
                custom_avatar_url: own('u/own.webp'),
                avatar_url: 'https://lh3.googleusercontent.com/g',
            },
        });

        expect(u?.avatarUrl).toBe(own('u/own.webp'));
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
