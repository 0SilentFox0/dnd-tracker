import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
    verify: vi.fn(),
    cleanup: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    verifyBattleMapBackground: h.verify,
}));
vi.mock('@/lib/server/battle-maps/background-cleanup', () => ({
    removeUnreferencedBackgrounds: h.cleanup,
    backgroundOf: () => null,
}));
vi.mock('@/lib/utils/common/image-url', () => ({
    isHostedOnProjectStorage: () => true,
}));
vi.mock('@/lib/supabase/battle-map-storage', () => ({
    resolveMapBackgroundForPersistence: async (b: string) => ({
        ok: true,
        background: b,
    }),
}));

import { withStoredBackground } from '../library-service';

const input = {
    map: { cols: 20, rows: 20, background: 'https://p/x.png', opacity: 0.5 },
} as never;

describe('withStoredBackground verification outcomes', () => {
    beforeEach(() => vi.clearAllMocks());

    it('keeps the uploaded file and answers 503 when the check is unavailable', async () => {
        h.verify.mockResolvedValue('unavailable');

        await expect(withStoredBackground(input, 'c1')).rejects.toMatchObject({
            status: 503,
        });
        expect(h.cleanup).not.toHaveBeenCalled();
    });

    it('deletes an invalid upload and answers 400', async () => {
        h.verify.mockResolvedValue('invalid');

        await expect(withStoredBackground(input, 'c1')).rejects.toMatchObject({
            status: 400,
        });
        expect(h.cleanup).toHaveBeenCalledWith('c1', ['https://p/x.png']);
    });

    it('passes a valid upload through', async () => {
        h.verify.mockResolvedValue('valid');

        await expect(withStoredBackground(input, 'c1')).resolves.toBeTruthy();
        expect(h.cleanup).not.toHaveBeenCalled();
    });
});
