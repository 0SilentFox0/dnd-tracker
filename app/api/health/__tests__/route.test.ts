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

describe('GET /api/health', () => {
    beforeEach(() => {
        db.calls = 0;
        db.queryRaw = async () => [{ '?column?': 1 }];
    });

    it('returns ok without querying the database by default', async () => {
        const response = await GET(new Request('http://localhost/api/health') as never);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ok' });
        expect(db.calls).toBe(0);
    });

    it('checks the database when deep=1', async () => {
        const response = await GET(new Request('http://localhost/api/health?deep=1') as never);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ok' });
        expect(db.calls).toBe(1);
    });

    it('hides database errors on a failed deep check', async () => {
        db.queryRaw = async () => {
            throw new Error('secret connection details');
        };

        const response = await GET(new Request('http://localhost/api/health?deep=1') as never);

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ status: 'error' });
    });
});
