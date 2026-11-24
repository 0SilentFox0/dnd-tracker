import { describe, expect, it } from 'vitest';

import {
    canonicalLabels,
    isKnownMetric,
    LATENCY_BOUNDS,
    METRICS,
} from '../metrics-catalog';

describe('canonicalLabels', () => {
    it('sorts keys and joins k=v', () => {
        expect(canonicalLabels({ le: '50', op: 'attack' }, undefined)).toBe(
            'le=50,op=attack'
        );
    });

    it('returns empty string without labels', () => {
        expect(canonicalLabels(undefined, 'battle.conflict')).toBe('');
        expect(canonicalLabels({}, 'battle.conflict')).toBe('');
    });

    it('drops unknown keys and values outside the enum', () => {
        expect(
            canonicalLabels({ result: 'ok', extra: 'x' }, 'pusher.trigger')
        ).toBe('result=ok');
        expect(canonicalLabels({ result: 'maybe' }, 'pusher.trigger')).toBe('');
    });

    it('validates pattern labels', () => {
        expect(canonicalLabels({ op: 'next-turn' }, 'battle.mutation')).toBe(
            'op=next-turn'
        );
        expect(canonicalLabels({ op: 'Bad Value!' }, 'battle.mutation')).toBe(
            ''
        );
    });
});

describe('isKnownMetric', () => {
    it('accepts catalog keys', () => {
        for (const key of Object.keys(METRICS))
            expect(isKnownMetric(key)).toBe(true);
    });

    it('accepts provider pattern for allowed names only', () => {
        expect(isKnownMetric('provider.pusher.channels')).toBe(true);
        expect(isKnownMetric('provider.cloudflare.requests_day')).toBe(true);
        expect(isKnownMetric('provider.unknown.x')).toBe(false);
        expect(isKnownMetric('provider.pusher.')).toBe(false);
    });

    it('rejects unknown keys and prototype names', () => {
        expect(isKnownMetric('nope')).toBe(false);
        expect(isKnownMetric('toString')).toBe(false);
    });
});

it('latency bounds are ascending', () => {
    expect([...LATENCY_BOUNDS]).toEqual(
        [...LATENCY_BOUNDS].sort((a, b) => a - b)
    );
});
