export interface PollDelayConfig {
    battlePollMs: number;
    pollBackoffMaxMs: number;
}

/** Base interval while healthy; exponential backoff with jitter after consecutive failed polls. */
export function nextPollDelay(
    failures: number,
    cfg: PollDelayConfig,
    rand: () => number = Math.random
): number {
    if (failures <= 0) return cfg.battlePollMs;

    const exp = Math.min(
        cfg.battlePollMs * 2 ** Math.min(failures, 16),
        cfg.pollBackoffMaxMs
    );

    return Math.round(exp * (0.8 + 0.4 * rand()));
}
