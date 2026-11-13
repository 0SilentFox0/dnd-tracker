import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import {
    loadParticipants,
    loadScenes,
    type RawDb,
} from '@/scripts/db/lib/battle-state-db';

describe('loaders', () => {
    it('skip the query for an empty scene list', async () => {
        const $queryRaw = vi.fn();

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        expect(await loadParticipants(db, [])).toEqual([]);
        expect($queryRaw).not.toHaveBeenCalled();
    });

    it('parse stored json and keep the raw text', async () => {
        const $queryRaw = vi.fn().mockResolvedValue([
            {
                id: 'p',
                battleId: 'b',
                snapshotText: '{"x":1}',
                stateText: '{"y":2}',
                snapshotHash: 'h',
                isPending: false,
            },
        ]);

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        const [row] = await loadParticipants(db, ['b']);

        expect(row.snapshot).toEqual({ x: 1 });
        expect(row.state).toEqual({ y: 2 });
        expect(row.snapshotText).toBe('{"x":1}');
    });

    it('filter scenes by status, campaign and scene id', async () => {
        const $queryRaw = vi.fn().mockResolvedValue([]);

        const db = { $queryRaw, $transaction: vi.fn() } as unknown as RawDb;

        await loadScenes(db, {
            status: 'active',
            campaignIds: ['c1'],
            sceneIds: ['s1'],
        });

        const { sql, values } = $queryRaw.mock.calls[0][0] as Prisma.Sql;

        expect(sql).toContain("s.status = 'active'");
        expect(values).toEqual(['c1', 's1']);

        await loadScenes(db, { status: 'all' });

        expect(($queryRaw.mock.calls[1][0] as Prisma.Sql).sql).not.toContain(
            'WHERE'
        );
    });
});
