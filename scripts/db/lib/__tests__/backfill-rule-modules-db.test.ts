import { describe, expect, it, vi } from 'vitest';

import {
    applyPlans,
    type RawDb,
    revertSnapshot,
} from '@/scripts/db/lib/backfill-rule-modules-db';
import type { RowPlan } from '@/scripts/db/lib/backfill-rule-modules-plan';
import {
    revertPlan,
    type RuleModulesSnapshot,
    type SnapshotRow,
} from '@/scripts/db/lib/backfill-rule-modules-snapshot';

const row = (id: string, over: Partial<SnapshotRow> = {}): SnapshotRow => ({
    table: 'campaigns',
    id,
    before: '{"a":1}',
    after: '{"a":2}',
    ...over,
});

const snapshot = (...rows: SnapshotRow[]): RuleModulesSnapshot => ({
    version: 1,
    createdAt: 'now',
    host: 'h',
    database: 'd',
    rows,
});

const fakeDb = (
    results: ({ text: string }[] | { id: string; text: string }[])[]
) => {
    const $queryRaw = vi.fn();

    for (const r of results) $queryRaw.mockResolvedValueOnce(r);

    const db: RawDb = {
        $queryRaw,
        $transaction: (fn: (tx: RawDb) => Promise<unknown>) => fn(db),
    } as unknown as RawDb;

    return { db, $queryRaw };
};

const plan = (id: string, before: string): RowPlan => ({
    row: { table: 'campaigns', id, campaignId: id, label: id },
    action: 'write',
    beforeText: before,
    added: ['x'],
    afterJson: { a: 2 },
});

describe('revertPlan', () => {
    it('classifies restore, alreadyBefore, conflict and missing', () => {
        const rows = [row('r'), row('b'), row('c'), row('m')];

        const actions = revertPlan(
            snapshot(...rows),
            new Map([
                ['campaigns:r', '{"a":2}'],
                ['campaigns:b', '{"a":1}'],
                ['campaigns:c', '{"a":3}'],
            ])
        );

        expect(actions.map((a) => a.action)).toEqual([
            'restore',
            'alreadyBefore',
            'conflict',
            'missing',
        ]);
    });
});

describe('applyPlans', () => {
    it('writes each target and reports the stored text', async () => {
        const { db } = fakeDb([[{ text: '{"a":2}' }]]);

        const write = vi.fn();

        const rows = await applyPlans(db, [plan('c1', '{"a":1}')], write);

        expect(rows).toEqual([row('c1')]);
        expect(write).toHaveBeenCalledWith(rows);
    });

    it('throws when the row changed since it was read', async () => {
        const { db } = fakeDb([[]]);

        const write = vi.fn();

        await expect(
            applyPlans(db, [plan('c1', '{"a":1}')], write)
        ).rejects.toThrow('змінився');
        expect(write).not.toHaveBeenCalled();
    });

    it('does nothing without write targets', async () => {
        const { db, $queryRaw } = fakeDb([]);

        expect(
            await applyPlans(
                db,
                [{ ...plan('c1', ''), action: 'unchanged' }],
                vi.fn()
            )
        ).toEqual([]);
        expect($queryRaw).not.toHaveBeenCalled();
    });
});

describe('revertSnapshot', () => {
    it('restores rows whose text still equals the applied one', async () => {
        const { db } = fakeDb([
            [{ id: 'c1', text: '{"a":2}' }],
            [{ text: '{"a":1}' }],
        ]);

        const out = await revertSnapshot(db, snapshot(row('c1')), false);

        expect(out).toEqual({ restored: 1, skipped: [] });
    });

    it('refuses a conflict without --force and overrides it with force', async () => {
        const conflict = () => [{ id: 'c1', text: '{"a":3}' }];

        await expect(
            revertSnapshot(fakeDb([conflict()]).db, snapshot(row('c1')), false)
        ).rejects.toThrow('Конфлікт');

        const { db } = fakeDb([conflict(), [{ text: '{"a":1}' }]]);

        expect(
            await revertSnapshot(db, snapshot(row('c1')), true)
        ).toMatchObject({ restored: 1 });
    });

    it('throws when the optimistic update matches nothing', async () => {
        const { db } = fakeDb([[{ id: 'c1', text: '{"a":2}' }], []]);

        await expect(
            revertSnapshot(db, snapshot(row('c1')), false)
        ).rejects.toThrow('змінився');
    });

    it('throws when the restored text differs from the snapshot', async () => {
        const { db } = fakeDb([
            [{ id: 'c1', text: '{"a":2}' }],
            [{ text: '{"a":9}' }],
        ]);

        await expect(
            revertSnapshot(db, snapshot(row('c1')), false)
        ).rejects.toThrow('не збігається');
    });

    it('skips already-before and missing rows', async () => {
        const { db } = fakeDb([[{ id: 'b', text: '{"a":1}' }]]);

        const out = await revertSnapshot(
            db,
            snapshot(row('b'), row('m')),
            false
        );

        expect(out.restored).toBe(0);
        expect(out.skipped.map((s) => s.action)).toEqual([
            'alreadyBefore',
            'missing',
        ]);
    });
});
