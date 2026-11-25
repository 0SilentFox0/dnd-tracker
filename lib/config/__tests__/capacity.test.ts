import { describe, expect, it } from 'vitest';

import { capacity,CAPACITY_PROFILES } from '../capacity';

describe('capacity', () => {
    it('free profile reproduces the legacy constants', () => {
        const c = capacity({});

        expect(c.dbConnectionLimit).toBe(5);
        expect(c.dbConnectionLimitDev).toBe(10);
        expect(c.dbPoolTimeoutSec).toBe(10);
        expect(c.dbPoolTimeoutSecDev).toBe(20);
        expect(c.writeTxTimeoutMs).toBe(30_000);
        expect(c.writeTxMaxWaitMs).toBe(5_000);
        expect(c.battlePollMs).toBe(30_000);
    });

    it('paid profile raises pool and batch capacity', () => {
        const free = capacity({});

        const paid = capacity({ CAPACITY_PROFILE: 'paid' });

        expect(paid).toEqual(CAPACITY_PROFILES.paid);
        expect(paid.dbConnectionLimit).toBeGreaterThan(free.dbConnectionLimit);
        expect(paid.maxHeavyJobsPerInstance).toBeGreaterThan(
            free.maxHeavyJobsPerInstance
        );
        expect(paid.copyTargetsBatch).toBeGreaterThan(free.copyTargetsBatch);
    });

    it('unknown profile falls back to free', () => {
        expect(capacity({ CAPACITY_PROFILE: 'huge' })).toEqual(
            CAPACITY_PROFILES.free
        );
    });

    it('per-field env overrides the profile', () => {
        const c = capacity({
            CAPACITY_PROFILE: 'paid',
            CAP_DB_CONNECTION_LIMIT: '40',
        });

        expect(c.dbConnectionLimit).toBe(40);
        expect(c.writeTxMaxWaitMs).toBe(CAPACITY_PROFILES.paid.writeTxMaxWaitMs);
    });

    it('ignores invalid overrides', () => {
        expect(
            capacity({ CAP_BATTLE_POLL_MS: 'abc', CAP_COPY_TARGETS_BATCH: '-3' })
        ).toEqual(CAPACITY_PROFILES.free);
    });
});
