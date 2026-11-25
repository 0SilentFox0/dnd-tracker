import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const upsert = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
    prisma: { opsAlertState: { upsert } },
}));

import { muteAlert } from '../alerts';

describe('muteAlert', () => {
    beforeEach(() => upsert.mockReset());

    it('writes silencedUntil for a known rule', async () => {
        const now = new Date('2026-11-24T10:00:00Z');

        const res = await muteAlert('db.size', 60, now);

        expect(res?.silencedUntil).toBe('2026-11-24T11:00:00.000Z');
        expect(upsert.mock.calls[0][0].update.silencedUntil).toEqual(
            new Date('2026-11-24T11:00:00Z')
        );
    });

    it('clears the mute for 0 minutes', async () => {
        const res = await muteAlert('db.size', 0);

        expect(res?.silencedUntil).toBeNull();
        expect(upsert.mock.calls[0][0].update.silencedUntil).toBeNull();
    });

    it('returns null for an unknown rule without touching the DB', async () => {
        expect(await muteAlert('nope', 60)).toBeNull();
        expect(upsert).not.toHaveBeenCalled();
    });
});
