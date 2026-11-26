export const SEEN_COOKIE = 'cn_seen';

const MIN_MAX_AGE_SECONDS = 60;

export function utcDay(now: Date): string {
    return now.toISOString().slice(0, 10);
}

export function seenValue(userId: string, now: Date): string {
    return `${userId}:${utcDay(now)}`;
}

export function shouldTouch(
    cookie: string | undefined,
    userId: string,
    now: Date
): boolean {
    return cookie !== seenValue(userId, now);
}

export function secondsUntilUtcMidnight(now: Date): number {
    const next = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
    );

    return Math.max(MIN_MAX_AGE_SECONDS, Math.ceil((next - now.getTime()) / 1000));
}
