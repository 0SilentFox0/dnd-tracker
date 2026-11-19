import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();

const tableOfKind = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { thing: { findMany: (a: unknown) => findMany(a) } },
}));
vi.mock('@/lib/server/templates/bundle', () => ({
    tableOfKind: (k: string) => tableOfKind(k),
}));

import { loadCopyNames } from '@/lib/server/content/copy/names';

beforeEach(() => {
    findMany.mockReset();
    tableOfKind.mockReset();
});

describe('loadCopyNames', () => {
    it('selects name for kinds with a name column', async () => {
        tableOfKind.mockReturnValue({
            delegate: 'thing',
            columns: ['id', 'name', 'createdAt'],
        });
        findMany.mockResolvedValue([{ id: 'a', name: 'Elf' }]);

        expect(await loadCopyNames('c1', 'races')).toEqual([
            { id: 'a', name: 'Elf' },
        ]);
        expect(findMany.mock.calls[0][0]).toMatchObject({
            where: { campaignId: 'c1' },
            select: { id: true, name: true },
        });
    });

    it('selects title for kinds without a name column', async () => {
        tableOfKind.mockReturnValue({
            delegate: 'thing',
            columns: ['id', 'title', 'createdAt'],
        });
        findMany.mockResolvedValue([{ id: 't', title: 'Battle theme' }]);

        expect(await loadCopyNames('c1', 'tracks')).toEqual([
            { id: 't', name: 'Battle theme' },
        ]);
        expect(findMany.mock.calls[0][0].select).toEqual({
            id: true,
            title: true,
        });
    });
});
