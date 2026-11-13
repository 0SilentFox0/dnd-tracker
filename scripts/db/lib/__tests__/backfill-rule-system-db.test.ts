import type { Prisma } from '@prisma/client';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
    applyPlans,
    currentTexts,
    type RawDb,
    revertSnapshot,
} from '@/scripts/db/lib/backfill-rule-system-db';
import {
    planRow,
    type RowPlan,
    type RulesRow,
} from '@/scripts/db/lib/backfill-rule-system-plan';
import type {
    RuleSystemSnapshot,
    SnapshotRow,
} from '@/scripts/db/lib/backfill-rule-system-snapshot';

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

const tableOf = (sql: string) =>
    sql.includes('battle_scenes') ? 'battle_scenes' : 'campaigns';

/** in-memory stand-in for the two tables; the stored text is whatever the UPDATE wrote */
function fakeDb(initial: Record<string, string>) {
    const store = new Map(Object.entries(initial));

    const db: RawDb = {
        async $queryRaw<T>(query: Prisma.Sql): Promise<T> {
            const table = tableOf(query.sql);

            if (query.sql.startsWith('UPDATE')) {
                const [next, id, expected] = query.values as string[];

                const key = `${table}:${id}`;

                if (store.get(key) !== expected) return [] as T;

                store.set(key, next);

                return [{ text: next }] as T;
            }

            return (query.values as string[]).flatMap((id) => {
                const text = store.get(`${table}:${id}`);

                return text === undefined ? [] : [{ id, text }];
            }) as T;
        },
        async $transaction(fn) {
            const backup = new Map(store);

            try {
                return await fn(db);
            } catch (error) {
                store.clear();

                for (const [k, v] of backup) store.set(k, v);

                throw error;
            }
        },
    };

    return { db, store };
}

const rulesRow = (id: string, text: string): RulesRow => ({
    table: 'campaigns',
    id,
    campaignId: id,
    label: id,
    kind: 'campaign',
    text,
});

const planFor = (id: string, text: string): RowPlan =>
    planRow(rulesRow(id, text), undefined, { skipModules: new Set() });

describe('applyPlans', () => {
    it('writes only write-plans and returns the stored text', async () => {
        const { db, store } = fakeDb({
            'campaigns:a': '{}',
            'campaigns:b': '{"system": {"key": "x"}}',
        });

        const write = vi.fn();

        const plans = [
            planFor('a', '{}'),
            planFor('b', '{"system": {"key": "x"}}'),
        ];

        const rows = await applyPlans(db, plans, write);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            table: 'campaigns',
            id: 'a',
            before: '{}',
        });
        expect(JSON.parse(rows[0].after)).toHaveProperty('system.key');
        expect(store.get('campaigns:a')).toBe(rows[0].after);
        expect(store.get('campaigns:b')).toBe('{"system": {"key": "x"}}');
        expect(write).toHaveBeenCalledWith(rows);
    });

    it('a changed row aborts everything and skips the snapshot write', async () => {
        const { db, store } = fakeDb({
            'campaigns:a': '{}',
            'campaigns:b': '{"edited": 1}',
        });

        const write = vi.fn();

        const plans = [planFor('a', '{}'), planFor('b', '{}')];

        await expect(applyPlans(db, plans, write)).rejects.toThrow(/змінився/);
        expect(write).not.toHaveBeenCalled();
        expect(store.get('campaigns:a')).toBe('{}');
    });

    it('without write-plans there is no transaction', async () => {
        const { db } = fakeDb({});

        const spy = vi.spyOn(db, '$transaction');

        expect(await applyPlans(db, [], vi.fn())).toEqual([]);
        expect(spy).not.toHaveBeenCalled();
    });
});

describe('revertSnapshot', () => {
    const rows: SnapshotRow[] = [
        { table: 'campaigns', id: 'a', before: '{}', after: '{"s": 1}' },
        { table: 'campaigns', id: 'b', before: '{}', after: '{"s": 2}' },
        { table: 'campaigns', id: 'c', before: '{}', after: '{"s": 3}' },
    ];

    const snapshot: RuleSystemSnapshot = {
        version: 1,
        createdAt: '2026-11-13T00:00:00.000Z',
        host: 'localhost',
        database: 'db',
        rows,
    };

    it('a conflict without force throws and changes nothing', async () => {
        const { db, store } = fakeDb({
            'campaigns:a': '{"s": 1}',
            'campaigns:b': '{"edited": 1}',
            'campaigns:c': '{"s": 3}',
        });

        await expect(revertSnapshot(db, snapshot, false)).rejects.toThrow(
            /Конфлікт/
        );
        expect(store.get('campaigns:a')).toBe('{"s": 1}');
        expect(store.get('campaigns:c')).toBe('{"s": 3}');
    });

    it('force restores conflicts too', async () => {
        const { db, store } = fakeDb({
            'campaigns:a': '{"s": 1}',
            'campaigns:b': '{"edited": 1}',
            'campaigns:c': '{"s": 3}',
        });

        const result = await revertSnapshot(db, snapshot, true);

        expect(result.restored).toBe(3);
        expect([...store.values()]).toEqual(['{}', '{}', '{}']);
    });

    it('already restored rows are skipped', async () => {
        const { db, store } = fakeDb({
            'campaigns:a': '{}',
            'campaigns:b': '{"s": 2}',
        });

        const result = await revertSnapshot(db, snapshot, false);

        expect(result.restored).toBe(1);
        expect(result.skipped.map((s) => [s.row.id, s.action])).toEqual([
            ['a', 'alreadyBefore'],
            ['c', 'missing'],
        ]);
        expect(store.get('campaigns:b')).toBe('{}');
    });
});

describe('currentTexts', () => {
    it('reads both tables by id', async () => {
        const { db } = fakeDb({
            'campaigns:a': 'A',
            'battle_scenes:b': 'B',
        });

        const texts = await currentTexts(db, [
            { table: 'campaigns', id: 'a', before: '', after: '' },
            { table: 'battle_scenes', id: 'b', before: '', after: '' },
        ]);

        expect(texts.get('campaigns:a')).toBe('A');
        expect(texts.get('battle_scenes:b')).toBe('B');
    });
});
