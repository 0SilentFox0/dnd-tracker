import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: queryRaw } }));

const UUID = '11111111-1111-4111-8111-111111111111';

const load = async () =>
    (await import('@/lib/server/admin/auth-meta')).readAuthMeta;

describe('readAuthMeta', () => {
    beforeEach(() => {
        vi.resetModules();
        queryRaw.mockReset();
    });

    it('returns an empty map without a second query when auth.users is missing', async () => {
        queryRaw.mockResolvedValueOnce([{ ok: false }]);

        const readAuthMeta = await load();

        expect((await readAuthMeta([UUID])).size).toBe(0);
        expect(queryRaw).toHaveBeenCalledTimes(1);

        await readAuthMeta([UUID]);
        expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it('maps rows to iso strings', async () => {
        queryRaw.mockResolvedValueOnce([{ ok: true }]).mockResolvedValueOnce([
            {
                id: UUID,
                banned_until: new Date('2030-01-01T00:00:00Z'),
                last_sign_in_at: null,
            },
        ]);

        const readAuthMeta = await load();

        expect((await readAuthMeta([UUID, 'not-a-uuid'])).get(UUID)).toEqual({
            bannedUntil: '2030-01-01T00:00:00.000Z',
            lastSignInAt: null,
        });
    });

    it('returns an empty map when the query fails', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        queryRaw
            .mockResolvedValueOnce([{ ok: true }])
            .mockRejectedValueOnce(new Error('boom'));

        const readAuthMeta = await load();

        expect((await readAuthMeta([UUID])).size).toBe(0);
        warn.mockRestore();
    });
});
