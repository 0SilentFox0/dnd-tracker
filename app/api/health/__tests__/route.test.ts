import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../route';

const db = vi.hoisted(() => ({
    calls: 0,
    queryRaw: async () => [{ '?column?': 1 }],
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        $queryRaw: () => {
            db.calls++;

            return db.queryRaw();
        },
    },
}));

const deepRequest = (
    headers: Record<string, string> = { 'x-health-secret': 's3cret' }
) => new Request('http://localhost/api/health?deep=1', { headers });

describe('GET /api/health', () => {
    beforeEach(() => {
        process.env.HEALTH_SECRET = 's3cret';
        db.calls = 0;
        db.queryRaw = async () => [{ '?column?': 1 }];
    });

    it('returns ok without querying the database by default', async () => {
        const response = await GET(
            new Request('http://localhost/api/health') as never
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ok' });
        expect(db.calls).toBe(0);
    });

    it('checks the database when deep=1', async () => {
        const response = await GET(deepRequest());

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ok' });
        expect(db.calls).toBe(1);
    });

    it('hides database errors on a failed deep check', async () => {
        db.queryRaw = async () => {
            throw new Error('secret connection details');
        };

        const response = await GET(deepRequest());

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ status: 'error' });
    });

    it('refuses deep without the secret and does not touch the database', async () => {
        const response = await GET(deepRequest({}) as never);

        expect(response.status).toBe(401);
        expect(db.calls).toBe(0);
    });

    it('refuses deep when HEALTH_SECRET is not configured', async () => {
        delete process.env.HEALTH_SECRET;

        const response = await GET(deepRequest() as never);

        expect(response.status).toBe(401);
        expect(db.calls).toBe(0);
    });
});
