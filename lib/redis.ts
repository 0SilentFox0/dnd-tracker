import { Redis } from '@upstash/redis';

let cachedClient: Redis | null = null;

let resolved = false;

interface UpstashCreds {
    url: string;
    token: string;
}

function readUpstashCreds(): UpstashCreds | null {
    const candidates: Array<[string, string]> = [
        ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
        ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
        ['dnd_KV_REST_API_URL', 'dnd_KV_REST_API_TOKEN'],
    ];

    for (const [urlVar, tokenVar] of candidates) {
        const url = process.env[urlVar]?.trim();

        const token = process.env[tokenVar]?.trim();

        if (url && token) {
            return { url, token };
        }
    }

    return null;
}

export function getRedisClient(): Redis | null {
    if (resolved) return cachedClient;

    resolved = true;

    const creds = readUpstashCreds();

    if (!creds) return null;

    try {
        cachedClient = new Redis(creds);

        return cachedClient;
    } catch (err) {
        console.warn('[redis] init failed — running without Redis', {
            error: String(err),
        });

        return null;
    }
}
