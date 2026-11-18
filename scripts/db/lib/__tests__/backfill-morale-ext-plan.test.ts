import { describe, expect, it } from 'vitest';

import '@/lib/utils/rules/systems/registry';
import {
    applyExtRevert,
    extRowKey,
    type ExtSnapshot,
    parseExtArgs,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    assertSameMoraleHashes,
    MORALE_TABLES,
    type MoraleBackfillRow,
    pendingMorale,
    planMorale,
    planMoraleRow,
    summarizeMorale,
} from '@/scripts/db/lib/backfill-morale-ext-plan';

const row = (over: Partial<MoraleBackfillRow> = {}): MoraleBackfillRow => ({
    table: 'characters',
    id: 'c1',
    campaignId: 'camp',
    morale: 2,
    characteristicsText: '{"strength": 10}',
    ...over,
});

describe('planMoraleRow', () => {
    it('a column of 0 without ext counts as done (character create never persists morale)', () => {
        expect(planMoraleRow(row({ morale: 0 })).action).toBe('unchanged');
    });

    it('writes the column into ext.morale.value and keeps the content hash', () => {
        for (const table of MORALE_TABLES) {
            const plan = planMoraleRow(row({ table, validFrom: 1 }));

            expect(plan.action).toBe('write');
            expect(JSON.parse(plan.afterText ?? '')).toEqual({
                strength: 10,
                ext: { morale: { value: 2 } },
            });
            expect(plan.afterHash).toBe(plan.beforeHash);
            expect(() => assertSameMoraleHashes([plan])).not.toThrow();
        }
    });

    it('keeps foreign ext keys and reports divergent / non-object rows', () => {
        const kept = planMoraleRow(
            row({ characteristicsText: '{"ext":{"x":1,"morale":{"y":2}}}' })
        );

        expect(JSON.parse(kept.afterText ?? '').ext).toEqual({
            x: 1,
            morale: { y: 2, value: 2 },
        });
        expect(
            planMoraleRow(
                row({ characteristicsText: '{"ext":{"morale":{"value":3}}}' })
            )
        ).toMatchObject({ action: 'skipped', reason: 'divergent' });
        expect(
            planMoraleRow(row({ characteristicsText: 'null' }))
        ).toMatchObject({ action: 'skipped', reason: 'notObject' });
    });

    it('the hash guard throws when legacy and migrated hashes differ', () => {
        const plan = planMoraleRow(row());

        expect(() =>
            assertSameMoraleHashes([{ ...plan, afterHash: 'other' }])
        ).toThrow(/Hash guard/);
    });

    it('counts rows of active-battle campaigns', () => {
        const plans = planMorale([
            row(),
            row({ id: 'c2', campaignId: 'busy' }),
        ]);

        expect(summarizeMorale(plans, new Set(['busy'])).activeBattle).toBe(1);
    });
});

describe('idempotency and revert', () => {
    const rows = [row(), row({ id: 'c2', morale: -1 })];

    it('a second apply changes nothing', () => {
        const once = rows.map((r) => ({
            ...r,
            characteristicsText: planMoraleRow(r).afterText ?? '',
        }));

        expect(pendingMorale(once)).toBe(0);
        expect(planMorale(once).every((p) => p.action === 'unchanged')).toBe(
            true
        );
    });

    it('revert restores byte for byte', () => {
        const snapshot: ExtSnapshot = {
            version: 1,
            kind: 'morale-ext',
            createdAt: '',
            host: 'h',
            database: 'd',
            rows: planMorale(rows).map((p) => ({
                table: p.row.table,
                id: p.row.id,
                before: p.row.characteristicsText,
                after: p.afterText ?? '',
            })),
        };

        const store = new Map(
            snapshot.rows.map((r) => [extRowKey(r), r.after])
        );

        expect(applyExtRevert(snapshot, store, false)).toBe(2);
        expect(
            snapshot.rows.every((r) => store.get(extRowKey(r)) === r.before)
        ).toBe(true);
    });
});

describe('parseExtArgs --table', () => {
    it('requires a known table for dry run and apply but not for revert', () => {
        expect(() => parseExtArgs([], MORALE_TABLES)).toThrow(/--table/);
        expect(
            parseExtArgs(['--table', 'units', '--apply'], MORALE_TABLES).table
        ).toBe('units');
        expect(parseExtArgs(['--revert', 'f.json'], MORALE_TABLES).mode).toBe(
            'revert'
        );
    });
});
