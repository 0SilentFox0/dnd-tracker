import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const requireAdmin = vi.hoisted(() => vi.fn());

const readSeries = vi.hoisted(() => vi.fn());

const muteAlert = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/api/require-platform-admin', () => ({
    requirePlatformAdmin: requireAdmin,
}));
vi.mock('@/lib/server/ops/summary', () => ({ buildSummary: vi.fn() }));
vi.mock('@/lib/server/ops/db-top', () => ({ readDbTop: vi.fn() }));
vi.mock('@/lib/server/ops/read-series', () => ({ readSeries }));
vi.mock('@/lib/server/ops/alerts', () => ({
    readAlerts: vi.fn(),
    muteAlert,
}));

import { POST as postMute } from '@/app/api/ops/alerts/[rule]/mute/route';
import { GET as getAlerts } from '@/app/api/ops/alerts/route';
import { GET as getDbTop } from '@/app/api/ops/db-top/route';
import { GET as getSeries } from '@/app/api/ops/series/route';
import { GET as getSummary } from '@/app/api/ops/summary/route';

const notFound = () => NextResponse.json({ error: 'nf' }, { status: 404 });

const req = (url: string, init?: RequestInit) =>
    new Request(`http://localhost${url}`, init);

const mute = (minutes: number, rule = 'db.size') =>
    postMute(req('/x', { method: 'POST', body: JSON.stringify({ minutes }) }), {
        params: Promise.resolve({ rule }),
    });

describe('ops read routes', () => {
    beforeEach(() => {
        requireAdmin.mockReset();
        readSeries.mockReset();
        muteAlert.mockReset();
    });

    it('return 404 for non-owners', async () => {
        requireAdmin.mockResolvedValue(notFound());

        const statuses = await Promise.all([
            getSummary().then((r) => r.status),
            getSeries(req('/x?range=1h&metrics=db.size_bytes')).then(
                (r) => r.status
            ),
            getAlerts(req('/x')).then((r) => r.status),
            getDbTop().then((r) => r.status),
            mute(60).then((r) => r.status),
        ]);

        expect(statuses).toEqual([404, 404, 404, 404, 404]);
        expect(readSeries).not.toHaveBeenCalled();
    });

    it('series rejects a bad range with 400', async () => {
        requireAdmin.mockResolvedValue({ userId: 'u' });

        const res = await getSeries(req('/x?range=2h&metrics=db.size_bytes'));

        expect(res.status).toBe(400);
    });

    it('series passes parsed specs to the reader', async () => {
        requireAdmin.mockResolvedValue({ userId: 'u' });
        readSeries.mockResolvedValue({ range: '1h', stepMs: 1, series: {} });

        const res = await getSeries(
            req('/x?range=1h&metrics=battle.mutation:p95')
        );

        expect(res.status).toBe(200);
        expect(readSeries.mock.calls[0][0][0].agg).toBe('p95');
    });

    it('mute validates minutes and maps an unknown rule to 404', async () => {
        requireAdmin.mockResolvedValue({ userId: 'u' });

        expect((await mute(5)).status).toBe(400);

        muteAlert.mockResolvedValue(null);

        expect((await mute(60, 'nope')).status).toBe(404);

        muteAlert.mockResolvedValue({ silencedUntil: 'x' });

        expect((await mute(60)).status).toBe(200);
        expect(muteAlert).toHaveBeenLastCalledWith('db.size', 60);
    });
});
