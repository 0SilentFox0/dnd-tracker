import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    commitUserAvatar,
    removeUserAvatar,
} from '@/lib/server/users/avatar';

const updateUserById = vi.fn();

const list = vi.fn();

const remove = vi.fn();

const base = 'https://p.supabase.co/storage/v1/object/public/user-avatars';

const id = (c: string) => c.repeat(32);

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        auth: { admin: { updateUserById } },
        storage: {
            from: () => ({
                list,
                remove,
                createSignedUploadUrl: vi.fn(),
                getPublicUrl: (path: string) => ({
                    data: { publicUrl: `${base}/${path}` },
                }),
            }),
            listBuckets: vi
                .fn()
                .mockResolvedValue({ data: [{ name: 'user-avatars' }], error: null }),
            updateBucket: vi.fn().mockResolvedValue({ error: null }),
            createBucket: vi.fn().mockResolvedValue({ error: null }),
        },
    }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co');
    updateUserById.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    list.mockResolvedValue({ data: [], error: null });
});

describe('commitUserAvatar', () => {
    it('rejects a url under another user and writes nothing', async () => {
        const r = await commitUserAvatar('u1', `${base}/u2/${id('a')}.webp`);

        expect(r.ok).toBe(false);
        expect(updateUserById).not.toHaveBeenCalled();
    });

    it('stores the url and removes the older objects', async () => {
        const url = `${base}/u1/${id('a')}.webp`;

        list.mockResolvedValue({
            data: [{ name: `${id('a')}.webp` }, { name: `${id('b')}.webp` }],
            error: null,
        });

        const r = await commitUserAvatar('u1', url);

        expect(r).toEqual({ ok: true, value: { avatarUrl: url } });
        expect(updateUserById).toHaveBeenCalledTimes(1);
        expect(updateUserById).toHaveBeenCalledWith('u1', {
            user_metadata: { custom_avatar_url: url },
        });
        expect(remove).toHaveBeenCalledWith([`u1/${id('b')}.webp`]);
    });

    it('keeps the new object when the metadata write fails', async () => {
        updateUserById.mockResolvedValue({ error: { message: 'boom' } });

        const r = await commitUserAvatar('u1', `${base}/u1/${id('a')}.webp`);

        expect(r).toEqual({ ok: false, message: API_ERRORS.INTERNAL });
        expect(remove).not.toHaveBeenCalled();
    });
});

describe('removeUserAvatar', () => {
    it('clears the metadata and removes every object', async () => {
        list.mockResolvedValue({
            data: [{ name: `${id('a')}.webp` }, { name: `${id('b')}.webp` }],
            error: null,
        });

        const r = await removeUserAvatar('u1');

        expect(r).toEqual({ ok: true, value: { ok: true } });
        expect(updateUserById).toHaveBeenCalledWith('u1', {
            user_metadata: { custom_avatar_url: null },
        });
        expect(remove).toHaveBeenCalledWith([
            `u1/${id('a')}.webp`,
            `u1/${id('b')}.webp`,
        ]);
    });

    it('is ok on an empty folder', async () => {
        const r = await removeUserAvatar('u1');

        expect(r.ok).toBe(true);
        expect(remove).not.toHaveBeenCalled();
    });
});
