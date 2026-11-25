import { describe, expect, it } from 'vitest';

import { ALERT_RULES } from '@/lib/ops/alert-rules';
import { activeTier, PROVIDER_LIMITS } from '@/lib/ops/limits';
import { isKnownMetric, PROVIDER_NAMES } from '@/lib/ops/metrics-catalog';

describe('PROVIDER_LIMITS', () => {
    it('has free and paid tiers for every provider', () => {
        for (const p of PROVIDER_NAMES) {
            expect(Object.keys(PROVIDER_LIMITS[p]).sort()).toEqual([
                'free',
                'paid',
            ]);
        }
    });
});

describe('activeTier', () => {
    it('defaults to free and follows OPS_TIER_<PROVIDER>', () => {
        expect(activeTier('pusher', {})).toBe('free');
        expect(activeTier('pusher', { OPS_TIER_PUSHER: 'paid' })).toBe('paid');
        expect(activeTier('pusher', { OPS_TIER_SUPABASE: 'paid' })).toBe(
            'free'
        );
    });
});

describe('ALERT_RULES', () => {
    it('has unique ids', () => {
        const ids = ALERT_RULES.map((r) => r.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('references only known metrics and known limit keys', () => {
        for (const r of ALERT_RULES) {
            if (r.agg !== 'expiryDays') {
                expect(
                    isKnownMetric(r.metric.replace(/:(count|sum|le)$/, '')),
                    r.id
                ).toBe(true);
            }

            if (r.per) {
                expect(
                    isKnownMetric(r.per.metric.replace(/:(count|sum|le)$/, '')),
                    r.id
                ).toBe(true);
            }

            if (r.limit) {
                expect(
                    PROVIDER_LIMITS[r.limit.provider].free[r.limit.key],
                    r.id
                ).toBeDefined();
            }
        }
    });
});
