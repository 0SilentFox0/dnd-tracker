export interface CapacityConfig {
    dbConnectionLimit: number;
    dbConnectionLimitDev: number;
    dbPoolTimeoutSec: number;
    dbPoolTimeoutSecDev: number;
    writeTxTimeoutMs: number;
    writeTxMaxWaitMs: number;
    battlePollMs: number;
    pollBackoffMaxMs: number;
    maxHeavyJobsPerInstance: number;
    copyTargetsBatch: number;
}

export type CapacityProfileName = 'free' | 'paid';

export const CAPACITY_PROFILES: Record<CapacityProfileName, CapacityConfig> = {
    free: {
        dbConnectionLimit: 5,
        dbConnectionLimitDev: 10,
        dbPoolTimeoutSec: 10,
        dbPoolTimeoutSecDev: 20,
        writeTxTimeoutMs: 30_000,
        writeTxMaxWaitMs: 5_000,
        battlePollMs: 30_000,
        pollBackoffMaxMs: 120_000,
        maxHeavyJobsPerInstance: 2,
        copyTargetsBatch: 10,
    },
    paid: {
        dbConnectionLimit: 15,
        dbConnectionLimitDev: 10,
        dbPoolTimeoutSec: 15,
        dbPoolTimeoutSecDev: 20,
        writeTxTimeoutMs: 30_000,
        writeTxMaxWaitMs: 10_000,
        battlePollMs: 30_000,
        pollBackoffMaxMs: 60_000,
        maxHeavyJobsPerInstance: 4,
        copyTargetsBatch: 25,
    },
};

export const CAPACITY_ENV: Record<keyof CapacityConfig, string> = {
    dbConnectionLimit: 'CAP_DB_CONNECTION_LIMIT',
    dbConnectionLimitDev: 'CAP_DB_CONNECTION_LIMIT_DEV',
    dbPoolTimeoutSec: 'CAP_DB_POOL_TIMEOUT_SEC',
    dbPoolTimeoutSecDev: 'CAP_DB_POOL_TIMEOUT_SEC_DEV',
    writeTxTimeoutMs: 'CAP_WRITE_TX_TIMEOUT_MS',
    writeTxMaxWaitMs: 'CAP_WRITE_TX_MAX_WAIT_MS',
    battlePollMs: 'CAP_BATTLE_POLL_MS',
    pollBackoffMaxMs: 'CAP_POLL_BACKOFF_MAX_MS',
    maxHeavyJobsPerInstance: 'CAP_MAX_HEAVY_JOBS_PER_INSTANCE',
    copyTargetsBatch: 'CAP_COPY_TARGETS_BATCH',
};

export type CapacityEnv = Partial<Record<string, string | undefined>>;

function profileName(env: CapacityEnv): CapacityProfileName {
    return env.CAPACITY_PROFILE?.trim() === 'paid' ? 'paid' : 'free';
}

export function capacity(env: CapacityEnv = process.env): CapacityConfig {
    const base = CAPACITY_PROFILES[profileName(env)];

    const result = { ...base };

    for (const key of Object.keys(CAPACITY_ENV) as (keyof CapacityConfig)[]) {
        const raw = Number(env[CAPACITY_ENV[key]]);

        if (Number.isFinite(raw) && raw > 0) result[key] = raw;
    }

    return result;
}

/** Literal NEXT_PUBLIC_* reads: Next inlines them into the client bundle only in this form. */
export function clientCapacity(): CapacityConfig {
    return capacity({
        CAPACITY_PROFILE: process.env.NEXT_PUBLIC_CAPACITY_PROFILE,
        [CAPACITY_ENV.battlePollMs]: process.env.NEXT_PUBLIC_CAP_BATTLE_POLL_MS,
        [CAPACITY_ENV.pollBackoffMaxMs]:
            process.env.NEXT_PUBLIC_CAP_POLL_BACKOFF_MAX_MS,
    });
}
