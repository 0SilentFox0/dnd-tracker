import { describe, expect, it } from 'vitest';

import { nextPollDelay } from '../poll-delay';

const cfg = { battlePollMs: 30_000, pollBackoffMaxMs: 120_000 };

describe('nextPollDelay', () => {
    it('keeps the base interval without failures', () => {
        expect(nextPollDelay(0, cfg, () => 0.9)).toBe(30_000);
    });

    it('grows with failures and stays capped (jitter included)', () => {
        const mid = () => 0.5;

        expect(nextPollDelay(1, cfg, mid)).toBe(60_000);
        expect(nextPollDelay(2, cfg, mid)).toBe(120_000);
        expect(nextPollDelay(10, cfg, mid)).toBe(120_000);
    });

    it('keeps jitter within +-20%', () => {
        expect(nextPollDelay(1, cfg, () => 0)).toBe(48_000);
        expect(nextPollDelay(1, cfg, () => 1)).toBe(72_000);
    });
});
