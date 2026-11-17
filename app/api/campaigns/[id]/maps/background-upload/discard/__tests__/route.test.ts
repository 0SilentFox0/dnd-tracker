import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const db = vi.hoisted(() => {
    const api = {
        battleMap: { findFirst: vi.fn() },
        battleMapVersion: { findFirst: vi.fn() },
        $executeRaw: vi.fn(async () => 1),
        $transaction: vi.fn(),
    };

    api.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn(api)
    );

    return api;
});

const remove = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({ storage: { from: () => ({ remove }) } }),
}));
vi.mock('@/lib/utils/api/as-dm', () => ({
    withDM: (_id: string, _action: string, handler: () => unknown) => handler(),
}));

import { POST } from '../route';

const name = 'a'.repeat(32);

const url = (campaign: string) =>
    `https://p.supabase.co/storage/v1/object/public/battle-maps/${campaign}/${name}.webp`;

const call = (imageUrl: string) =>
    POST(
        new Request('https://app.test/api/x', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
        }),
        { params: Promise.resolve({ id: 'camp1' }) }
    );

describe('discard unused battle map background', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co');
        db.battleMap.findFirst.mockResolvedValue(null);
        db.battleMapVersion.findFirst.mockResolvedValue(null);
        remove.mockResolvedValue({ error: null });
    });

    it('removes an unreferenced file under a campaign lock', async () => {
        expect((await call(url('camp1'))).status).toBe(200);
        expect(db.$executeRaw).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledWith([`camp1/${name}.webp`]);
    });

    it('keeps a file referenced by a map or a version', async () => {
        db.battleMap.findFirst.mockResolvedValue({ id: 'm' });
        await call(url('camp1'));

        db.battleMap.findFirst.mockResolvedValue(null);
        db.battleMapVersion.findFirst.mockResolvedValue({ mapId: 'm' });
        await call(url('camp1'));

        expect(remove).not.toHaveBeenCalled();
    });

    it('rejects a URL of another campaign without touching storage', async () => {
        expect((await call(url('other'))).status).toBe(400);
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
    });

    it('is idempotent and never fails when storage removal throws', async () => {
        remove.mockRejectedValue(new Error('down'));

        expect((await call(url('camp1'))).status).toBe(200);
        expect((await call(url('camp1'))).status).toBe(200);
    });
});
