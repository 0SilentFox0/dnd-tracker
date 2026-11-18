import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rotateApiToken } from '../api-tokens';

type Row = {
    id: string;
    campaignId: string;
    userId: string;
    name: string;
    prefix: string;
    tokenHash: string;
    scopes: string[];
    executionMode: string;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
};

const store = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => {
    const rows = () => store.rows as Row[];

    const matches = (row: Row, where: Partial<Row>) =>
        row.id === where.id &&
        row.campaignId === where.campaignId &&
        row.userId === where.userId &&
        (where.revokedAt === null ? row.revokedAt === null : true);

    const apiToken = {
        findFirst: async ({ where }: { where: Partial<Row> }) =>
            rows().find((row) => matches(row, where)) ?? null,
        updateMany: async ({
            where,
            data,
        }: {
            where: Partial<Row>;
            data: Partial<Row>;
        }) => {
            const hit = rows().filter((row) => matches(row, where));

            hit.forEach((row) => Object.assign(row, data));

            return { count: hit.length };
        },
        create: async ({ data }: { data: Partial<Row> }) => {
            const row = {
                id: `t${rows().length + 1}`,
                lastUsedAt: null,
                revokedAt: null,
                createdAt: new Date(),
                executionMode: 'review',
                ...data,
            } as Row;

            rows().push(row);

            return row;
        },
    };

    return {
        prisma: {
            apiToken,
            $transaction: async (
                fn: (tx: { apiToken: typeof apiToken }) => unknown
            ) => fn({ apiToken }),
        },
    };
});

const live = () =>
    (store.rows as Row[]).filter((row) => row.revokedAt === null);

beforeEach(() => {
    store.rows = [
        {
            id: 'old',
            campaignId: 'c1',
            userId: 'u1',
            name: 'Claude',
            prefix: 'dnd_abcd',
            tokenHash: 'h',
            scopes: ['read'],
            executionMode: 'auto',
            lastUsedAt: null,
            expiresAt: null,
            revokedAt: null,
            createdAt: new Date(),
        } satisfies Row,
    ];
});

describe('rotateApiToken', () => {
    it('revokes the old token and keeps exactly one live replacement', async () => {
        const created = await rotateApiToken('c1', 'u1', 'old');

        expect(created?.token).toBeTruthy();
        expect(created?.executionMode).toBe('auto');
        expect(live()).toHaveLength(1);
        expect(live()[0].id).not.toBe('old');
    });

    it('parallel rotations of one token yield a single live token', async () => {
        const results = await Promise.all([
            rotateApiToken('c1', 'u1', 'old'),
            rotateApiToken('c1', 'u1', 'old'),
        ]);

        expect(results.filter(Boolean)).toHaveLength(1);
        expect(live()).toHaveLength(1);
    });

    it('returns null for an already revoked token and creates nothing', async () => {
        await rotateApiToken('c1', 'u1', 'old');

        const before = store.rows.length;

        expect(await rotateApiToken('c1', 'u1', 'old')).toBeNull();
        expect(store.rows).toHaveLength(before);
    });
});
