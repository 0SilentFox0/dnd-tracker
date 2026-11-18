import { getRedisClient } from '@/lib/redis';

const KV_TTL_SECONDS = 60;

export async function kvGet<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();

    if (!redis) return null;

    try {
        const data = await redis.get<T>(key);

        return data ?? null;
    } catch {
        return null;
    }
}

export async function kvSet(
    key: string,
    value: unknown,
    ttlSeconds = KV_TTL_SECONDS
): Promise<void> {
    const redis = getRedisClient();

    if (!redis) return;

    try {
        await redis.set(key, value, { ex: ttlSeconds });
    } catch {
        // ignore
    }
}

export async function kvDel(key: string): Promise<void> {
    const redis = getRedisClient();

    if (!redis) return;

    try {
        await redis.del(key);
    } catch {
        // ignore
    }
}
