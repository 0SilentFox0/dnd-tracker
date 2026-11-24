import { decide, DOWN_TTL_SECONDS, messageFor } from './logic';

interface KV {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface Env {
    STATE: KV;
    APP_URL: string;
    OPS_COLLECT_SECRET: string;
    HEALTH_SECRET: string;
    OPS_TELEGRAM_BOT_TOKEN: string;
    OPS_TELEGRAM_CHAT_ID: string;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const ATTEMPTS = 3;

const TIMEOUT_MS = 5000;

async function probe(url: string, init: RequestInit, doFetch: Fetcher): Promise<boolean> {
    for (let i = 0; i < ATTEMPTS; i++) {
        const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);

        if (res?.ok) {
            return true;
        }
    }

    return false;
}

async function notify(env: Env, text: string, doFetch: Fetcher): Promise<void> {
    try {
        await doFetch(`https://api.telegram.org/bot${env.OPS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chat_id: env.OPS_TELEGRAM_CHAT_ID, text }),
        });
    } catch {
        // never log: the error message can contain the bot token URL
    }
}

export async function runCheck(env: Env, doFetch: Fetcher = fetch): Promise<void> {
    const base = env.APP_URL.replace(/\/+$/, '');

    const [collectOk, healthOk] = await Promise.all([
        probe(
            `${base}/api/ops/collect`,
            { method: 'POST', headers: { authorization: `Bearer ${env.OPS_COLLECT_SECRET}` } },
            doFetch
        ),
        probe(
            `${base}/api/health?deep=1`,
            { method: 'GET', headers: { authorization: `Bearer ${env.HEALTH_SECRET}` } },
            doFetch
        ),
    ]);

    const hasDownFlag = (await env.STATE.get('down')) !== null;

    const decision = decide({ collectOk, healthOk, hasDownFlag });

    if (decision === 'down') {
        await env.STATE.put('down', String(Date.now()), { expirationTtl: DOWN_TTL_SECONDS });
        await notify(env, messageFor('down', { collectOk, healthOk }), doFetch);
    } else if (decision === 'recovered') {
        await env.STATE.delete('down');
        await notify(env, messageFor('recovered', { collectOk, healthOk }), doFetch);
    }
}

const worker = {
    async scheduled(_event: unknown, env: Env): Promise<void> {
        await runCheck(env);
    },
};

export default worker;
