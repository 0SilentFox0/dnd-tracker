import { beforeEach, describe, expect, it, vi } from 'vitest';

const { copy, from, getPublicUrl } = vi.hoisted(() => ({
    copy: vi.fn(),
    getPublicUrl: vi.fn(),
    from: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({ storage: { from } }),
}));

import { copyStorageObject } from '@/lib/supabase/copy-object';

beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue({ copy, getPublicUrl });
    getPublicUrl.mockImplementation((p: string) => ({
        data: { publicUrl: `https://s/bk/${encodeURIComponent(p)}` },
    }));
});

describe('copyStorageObject', () => {
    it('copies within the bucket', async () => {
        copy.mockResolvedValue({ data: { path: 'b' }, error: null });

        await expect(copyStorageObject('bk', 'a', 'b')).resolves.toEqual({
            ok: true,
            url: 'https://s/bk/b',
        });
        expect(from).toHaveBeenCalledWith('bk');
        expect(copy).toHaveBeenCalledWith('a', 'b');
    });

    it('returns the storage error message', async () => {
        copy.mockResolvedValue({ data: null, error: { message: 'nope' } });

        await expect(copyStorageObject('bk', 'a', 'b')).resolves.toEqual({
            ok: false,
            message: 'nope',
        });
    });

    it('does not throw when the client fails', async () => {
        copy.mockRejectedValue(new Error('network'));

        await expect(copyStorageObject('bk', 'a', 'b')).resolves.toEqual({
            ok: false,
            message: 'network',
        });
    });
});
