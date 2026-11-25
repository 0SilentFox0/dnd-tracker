import { describe, expect, it } from 'vitest';

import {
    opsAlertsQuerySchema,
    opsMuteSchema,
    opsSeriesQuerySchema,
} from '../ops';

describe('opsSeriesQuerySchema', () => {
    it('accepts a valid query', () => {
        const r = opsSeriesQuerySchema.parse({
            range: '6h',
            metrics: 'db.size_bytes,battle.mutation:p95',
        });

        expect(r.metrics).toHaveLength(2);
    });

    it('rejects a bad range, unknown metric, empty and too many metrics', () => {
        expect(
            opsSeriesQuerySchema.safeParse({
                range: '2h',
                metrics: 'db.size_bytes',
            }).success
        ).toBe(false);
        expect(
            opsSeriesQuerySchema.safeParse({ range: '1h', metrics: 'nope' })
                .success
        ).toBe(false);
        expect(
            opsSeriesQuerySchema.safeParse({ range: '1h', metrics: '' }).success
        ).toBe(false);
        expect(
            opsSeriesQuerySchema.safeParse({
                range: '1h',
                metrics: Array(13).fill('db.size_bytes').join(','),
            }).success
        ).toBe(false);
    });
});

describe('opsMuteSchema', () => {
    it('allows only 0, 60 and 1440', () => {
        for (const minutes of [0, 60, 1440])
            expect(opsMuteSchema.safeParse({ minutes }).success).toBe(true);

        expect(opsMuteSchema.safeParse({ minutes: 30 }).success).toBe(false);
    });
});

describe('opsAlertsQuerySchema', () => {
    it('defaults and caps limit', () => {
        expect(opsAlertsQuerySchema.parse({}).limit).toBe(50);
        expect(opsAlertsQuerySchema.safeParse({ limit: 500 }).success).toBe(
            false
        );
    });
});
