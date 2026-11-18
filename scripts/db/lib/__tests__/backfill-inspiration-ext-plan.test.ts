import { describe, expect, it } from 'vitest';

import {
    applyExtRevert,
    extRowKey,
    type ExtSnapshot,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    casMatches,
    type InspirationBackfillRow,
    planInspiration,
    planInspirationRow,
    summarizeInspiration,
} from '@/scripts/db/lib/backfill-inspiration-ext-plan';

const row = (
    over: Partial<InspirationBackfillRow> = {}
): InspirationBackfillRow => ({
    id: 'c1',
    campaignId: 'camp',
    inspiration: true,
    updatedAt: '2026-01-01 00:00:00+00',
    characteristicsText: '{"strength": 10}',
    ...over,
});

describe('planInspirationRow', () => {
    it('sets ext.inspiration.available and keeps every other key', () => {
        const plan = planInspirationRow(
            row({
                characteristicsText:
                    '{"strength": 10, "ext": {"other": 1, "inspiration": {"note": "x"}}}',
            })
        );

        expect(plan.action).toBe('write');
        expect(JSON.parse(plan.afterText ?? '')).toEqual({
            strength: 10,
            ext: { other: 1, inspiration: { note: 'x', available: true } },
        });
    });

    it('leaves rows without the flag or already carrying the ext value', () => {
        expect(planInspirationRow(row({ inspiration: false })).action).toBe(
            'unchanged'
        );
        expect(
            planInspirationRow(
                row({
                    characteristicsText:
                        '{"ext":{"inspiration":{"available":false}}}',
                })
            ).action
        ).toBe('unchanged');
    });

    it('skips a characteristics value that is not an object', () => {
        expect(
            planInspirationRow(row({ characteristicsText: '[]' })).action
        ).toBe('skipped');
    });
});

describe('idempotency, CAS and revert', () => {
    const rows = [row(), row({ id: 'c2' })];

    const apply = (input: InspirationBackfillRow[]) =>
        input.map((r) => {
            const p = planInspirationRow(r);

            return p.action === 'write'
                ? { ...r, characteristicsText: p.afterText ?? '' }
                : r;
        });

    it('a second apply changes nothing', () => {
        const once = apply(rows);

        expect(summarizeInspiration(planInspiration(once)).write).toBe(0);
        expect(apply(once)).toEqual(once);
    });

    it('CAS fails when updatedAt or the stored text changed', () => {
        expect(casMatches(rows[0], rows[0])).toBe(true);
        expect(
            casMatches(rows[0], {
                updatedAt: '2026-01-02 00:00:00+00',
                characteristicsText: rows[0].characteristicsText,
            })
        ).toBe(false);
        expect(
            casMatches(rows[0], {
                updatedAt: rows[0].updatedAt,
                characteristicsText: '{}',
            })
        ).toBe(false);
    });

    it('revert restores the stored text byte for byte and conflicts on later edits', () => {
        const plans = planInspiration(rows);

        const snapshot: ExtSnapshot = {
            version: 1,
            kind: 'inspiration-ext',
            createdAt: '',
            host: 'h',
            database: 'd',
            rows: plans.map((p) => ({
                table: 'characters',
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
        expect(applyExtRevert(snapshot, store, false)).toBe(0);

        store.set(extRowKey(snapshot.rows[0]), '{"edited":true}');

        expect(() => applyExtRevert(snapshot, store, false)).toThrow(
            /Conflict/
        );
    });
});
