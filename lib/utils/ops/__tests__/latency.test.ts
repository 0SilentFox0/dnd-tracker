import { describe, expect, it } from 'vitest';

import { bucketStart, latencyBucket, quantileFromBuckets } from '../latency';

describe('bucketStart', () => {
    it('floors to the minute in UTC', () => {
        expect(
            bucketStart(new Date('2026-11-24T10:15:42.123Z')).toISOString()
        ).toBe('2026-11-24T10:15:00.000Z');
    });
});

describe('latencyBucket', () => {
    it('uses inclusive upper bounds', () => {
        expect(latencyBucket(50)).toBe('50');
        expect(latencyBucket(51)).toBe('100');
        expect(latencyBucket(3200)).toBe('3200');
        expect(latencyBucket(5000)).toBe('inf');
    });
});

describe('quantileFromBuckets', () => {
    it('returns null when empty', () => {
        expect(quantileFromBuckets({}, 0.95)).toBeNull();
    });

    it('interpolates inside a single bucket', () => {
        expect(quantileFromBuckets({ '100': 10 }, 0.5)).toBeCloseTo(75);
    });

    it('finds p95 across two buckets', () => {
        const p95 = quantileFromBuckets({ '50': 90, '200': 10 }, 0.95);

        expect(p95).toBeGreaterThan(100);
        expect(p95).toBeLessThanOrEqual(200);
    });

    it('caps the inf bucket at the last bound', () => {
        expect(quantileFromBuckets({ inf: 5 }, 0.95)).toBe(3200);
    });
});
