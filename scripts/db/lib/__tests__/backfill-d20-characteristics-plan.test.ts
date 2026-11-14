import { describe, expect, it, vi } from 'vitest';

import '@/lib/utils/rules/systems/registry';
import {
    applyPlans,
    type RawDb,
    revertSnapshot,
} from '@/scripts/db/lib/backfill-d20-characteristics-db';
import {
    assertSameHashes,
    d20CampaignIds,
    formatPlan,
    isD20Campaign,
    nonD20CampaignIds,
    planAll,
    planRow,
    reportRows,
    statColumns,
    type StatRow,
    summarizePlans,
} from '@/scripts/db/lib/backfill-d20-characteristics-plan';
import {
    assertNoActiveBattles,
    type CharacteristicsSnapshot,
    parseArgs,
    parseSnapshot,
    revertPlan,
} from '@/scripts/db/lib/backfill-d20-characteristics-snapshot';

const COLS = {
    strength: 12,
    dexterity: 14,
    constitution: 10,
    intelligence: 8,
    wisdom: 11,
    charisma: 9,
    armorClass: 15,
    initiative: 2,
    speed: 30,
};

const row = (over: Partial<StatRow> = {}): StatRow => ({
    table: 'characters',
    id: 'r1',
    campaignId: 'c1',
    label: 'Hero',
    characteristicsText: '{}',
    columns: { ...COLS },
    activeBattle: false,
    ...over,
});

describe('campaign selection', () => {
    it('keeps d20 presets and missing system, drops wfrp and invalid rules', () => {
        const facts = [
            {
                id: 'a',
                text: '{"system":{"key":"dnd5e"}}',
                activeBattle: false,
            },
            { id: 'b', text: '{}', activeBattle: false },
            { id: 'c', text: '{"system":{"key":"wfrp"}}', activeBattle: false },
            { id: 'd', text: 'oops', activeBattle: false },
            { id: 'e', text: '{"system":{"key":"nope"}}', activeBattle: false },
            { id: 'f', text: 'null', activeBattle: false },
        ];

        expect(d20CampaignIds(facts)).toEqual(['a', 'b', 'f']);
        expect(nonD20CampaignIds(facts)).toEqual(['c', 'd', 'e']);
        expect(isD20Campaign('{"system":{"key":"wfrp"}}')).toBe(false);
        expect(isD20Campaign('[1]')).toBe(true);
    });
});

describe('planRow', () => {
    it('writes all 9 keys for an empty characteristics and keeps others', () => {
        const plan = planRow(row({ characteristicsText: '{"extra":{"a":1}}' }));

        expect(plan.action).toBe('write');
        expect(plan.added).toEqual([...statColumns()]);
        expect(plan.afterJson).toEqual({ extra: { a: 1 }, ...COLS });
        expect(plan.beforeHash).toBe(plan.afterHash);
    });

    it('completes a partial row', () => {
        const plan = planRow(
            row({
                table: 'units',
                characteristicsText: '{"strength":12,"speed":30}',
            })
        );

        expect(plan.action).toBe('write');
        expect(plan.added).not.toContain('strength');
        expect(plan.afterJson).toEqual(COLS);
        expect(plan.beforeHash).toBe(plan.afterHash);
    });

    it('is idempotent on an already migrated row', () => {
        const done = planRow(row({ table: 'units_base', validFrom: 3 }));

        const again = planRow(
            row({
                table: 'units_base',
                validFrom: 3,
                characteristicsText: JSON.stringify(done.afterJson),
            })
        );

        expect(again.action).toBe('unchanged');
        expect(summarizePlans([again]).write).toBe(0);
    });

    it('skips non-object characteristics', () => {
        expect(planRow(row({ characteristicsText: '[]' })).skip).toBe(
            'notObject'
        );
        expect(planRow(row({ characteristicsText: 'null' })).skip).toBe(
            'notObject'
        );
    });

    it('fills only missing keys and never overwrites a stored value', () => {
        const plan = planRow(
            row({ characteristicsText: '{"armorClass":18,"speed":"x"}' })
        );

        expect(plan.afterJson).toEqual({ ...COLS, armorClass: 18 });
        expect(plan.added).not.toContain('armorClass');
        expect(plan.added).toContain('speed');
        expect(plan.divergent).toEqual(['armorClass']);
    });

    it('lists divergent rows even when nothing is missing', () => {
        const plan = planRow(
            row({ characteristicsText: JSON.stringify({ ...COLS, speed: 25 }) })
        );

        expect(plan.action).toBe('unchanged');
        expect(plan.divergent).toEqual(['speed']);
        expect(summarizePlans([plan]).divergent).toBe(1);
        expect(formatPlan(plan)[0]).toMatch(/^divergent .*speed/);
    });

    it('hash guard passes when the fill keeps the folded value', () => {
        const plans = planAll([
            row({ characteristicsText: '{"armorClass":18}' }),
        ]);

        expect(summarizePlans(plans).hashMismatches).toBe(0);
        expect(() => assertSameHashes(plans)).not.toThrow();
    });

    it('summarizes per table and active battles', () => {
        const s = summarizePlans(
            planAll([
                row(),
                row({ table: 'units', id: 'u', activeBattle: true }),
                row({ table: 'units_base', id: 'b', validFrom: 1 }),
            ])
        );

        expect(s.byTable).toEqual({ characters: 1, units: 1, units_base: 1 });
        expect(s.activeBattle).toBe(1);
    });
});

describe('reportRows', () => {
    it('counts rows whose columns differ from characteristics', () => {
        const migrated = JSON.stringify(COLS);

        const report = reportRows([
            row({ characteristicsText: migrated }),
            row({ id: 'r2' }),
            row({
                table: 'units',
                id: 'u',
                characteristicsText: JSON.stringify({ ...COLS, speed: 25 }),
            }),
        ]);

        expect(report.rows).toBe(3);
        expect(report.mismatched).toBe(2);
        expect(report.tables.characters.mismatched).toBe(1);
        expect(report.tables.units.mismatched).toBe(1);
        expect(report.excluded.orphan).toBe(0);
    });

    it('counts orphan rows separately and carries the non-d20 counts', () => {
        const report = reportRows(
            [row({ table: 'units_base', validFrom: 1, orphan: true })],
            { characters: 2, units: 3, units_base: 4 }
        );

        expect(report.excluded).toEqual({
            orphan: 1,
            nonD20: { characters: 2, units: 3, units_base: 4 },
        });
    });
});

describe('cli args and snapshot', () => {
    it('defaults to dry run with the hash guard on', () => {
        const args = parseArgs([]);

        expect(args.mode).toBe('dry');
        expect(args.expectSameHashes).toBe(true);
    });

    it('validates flag combinations', () => {
        expect(parseArgs(['--apply']).mode).toBe('apply');
        expect(parseArgs(['--report', '--expect-zero']).expectZero).toBe(true);
        expect(() => parseArgs(['--apply', '--report'])).toThrow();
        expect(() => parseArgs(['--expect-zero'])).toThrow();
        expect(() => parseArgs(['--force'])).toThrow();
        expect(() => parseArgs(['--allow-active-battles'])).toThrow();
        expect(() => parseArgs(['--revert'])).toThrow();
        expect(parseArgs(['--revert', 'f.json']).mode).toBe('revert');
        expect(() => assertNoActiveBattles(1, parseArgs([]))).toThrow();
    });

    it('rejects an invalid snapshot', () => {
        expect(() => parseSnapshot('{"version":2}')).toThrow();
    });
});

const snapshot = (
    rows: CharacteristicsSnapshot['rows']
): CharacteristicsSnapshot => ({
    version: 1,
    createdAt: 'now',
    host: 'h',
    database: 'd',
    rows,
});

describe('revertPlan', () => {
    it('classifies restore, alreadyBefore, conflict and missing', () => {
        const rows = ['r', 'b', 'c', 'm'].map((id) => ({
            table: 'units_base' as const,
            id,
            validFrom: 1,
            before: '{}',
            after: '{"a": 1}',
        }));

        const actions = revertPlan(
            snapshot(rows),
            new Map([
                ['units_base:r@1', '{"a": 1}'],
                ['units_base:b@1', '{}'],
                ['units_base:c@1', '{"a": 2}'],
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

const fakeDb = (results: unknown[][]) => {
    const $queryRaw = vi.fn();

    for (const r of results) $queryRaw.mockResolvedValueOnce(r);

    const db = {
        $queryRaw,
        $transaction: (fn: (tx: RawDb) => Promise<unknown>) => fn(db),
    } as unknown as RawDb;

    return { db, $queryRaw };
};

describe('applyPlans', () => {
    const plan = planRow(row());

    const written = (over: Record<string, unknown> = {}) => ({
        text: JSON.stringify(plan.afterJson),
        ...COLS,
        ...over,
    });

    it('writes and records a snapshot row', async () => {
        const { db } = fakeDb([[written()]]);

        const write = vi.fn();

        const rows = await applyPlans(db, [plan], write);

        expect(rows).toHaveLength(1);
        expect(rows[0].before).toBe('{}');
        expect(write).toHaveBeenCalledWith(rows);
    });

    it('throws when the row changed since it was read', async () => {
        const { db } = fakeDb([[]]);

        await expect(applyPlans(db, [plan], vi.fn())).rejects.toThrow(
            /changed since/
        );
    });

    it('throws when the stored hash differs from the planned one', async () => {
        const { db } = fakeDb([
            [written({ text: JSON.stringify({ ...COLS, strength: 99 }) })],
        ]);

        await expect(applyPlans(db, [plan], vi.fn())).rejects.toThrow(
            /contentRowHash/
        );
    });

    it('does nothing for unchanged plans', async () => {
        const { db, $queryRaw } = fakeDb([]);

        const unchanged = planRow(
            row({ characteristicsText: JSON.stringify(COLS) })
        );

        expect(await applyPlans(db, [unchanged], vi.fn())).toEqual([]);
        expect($queryRaw).not.toHaveBeenCalled();
    });
});

describe('revertSnapshot', () => {
    const r = {
        table: 'characters' as const,
        id: 'r1',
        before: '{}',
        after: '{"a": 1}',
    };

    it('restores and verifies', async () => {
        const { db } = fakeDb([
            [{ id: 'r1', validFrom: null, text: '{"a": 1}' }],
            [{ text: '{}' }],
        ]);

        expect(await revertSnapshot(db, snapshot([r]), false)).toMatchObject({
            restored: 1,
        });
    });

    it('refuses on conflict without --force', async () => {
        const { db } = fakeDb([
            [{ id: 'r1', validFrom: null, text: '{"a": 2}' }],
        ]);

        await expect(revertSnapshot(db, snapshot([r]), false)).rejects.toThrow(
            /Conflict/
        );
    });
});
