import { describe, expect, it, vi } from 'vitest';

import { type Env,runCheck } from '../src/index';

const makeEnv = (flag: boolean) => {
    const store = new Map<string, string>(flag ? [['down', '1']] : []);

    const env: Env = {
        STATE: {
            get: async (k) => store.get(k) ?? null,
            put: async (k, v) => void store.set(k, v),
            delete: async (k) => void store.delete(k),
        },
        APP_URL: 'https://app.example.com/',
        OPS_COLLECT_SECRET: 'collect-secret',
        HEALTH_SECRET: 'health-secret',
        OPS_TELEGRAM_BOT_TOKEN: 'bot-token',
        OPS_TELEGRAM_CHAT_ID: '42',
    };

    return { env, store };
};

const route = (collect: number, health: number) =>
    vi.fn(async (url: string, _init?: RequestInit) => {
        if (url.includes('telegram')) return new Response('{}', { status: 200 });

        if (url.includes('/api/ops/collect')) return new Response('', { status: collect });

        return new Response('', { status: health });
    });

const telegramCalls = (f: ReturnType<typeof route>) =>
    f.mock.calls.filter(([u]) => String(u).includes('telegram'));

describe('runCheck', () => {
    it('retries 3 times then alerts once and sets the flag', async () => {
        const { env, store } = makeEnv(false);

        const f = route(200, 503);

        await runCheck(env, f);

        expect(f.mock.calls.filter(([u]) => String(u).includes('health'))).toHaveLength(3);
        expect(telegramCalls(f)).toHaveLength(1);
        expect(store.has('down')).toBe(true);
    });

    it('does not alert again while the flag exists', async () => {
        const { env } = makeEnv(true);

        const f = route(500, 500);

        await runCheck(env, f);

        expect(telegramCalls(f)).toHaveLength(0);
    });

    it('sends recovered and clears the flag', async () => {
        const { env, store } = makeEnv(true);

        const f = route(200, 200);

        await runCheck(env, f);

        expect(telegramCalls(f)).toHaveLength(1);
        expect(store.has('down')).toBe(false);
    });

    it('never puts secrets into the telegram text', async () => {
        const { env } = makeEnv(false);

        const f = route(500, 500);

        await runCheck(env, f);

        const body = String(telegramCalls(f)[0][1]?.body);

        expect(body).not.toMatch(/collect-secret|health-secret|bot-token|app\.example/);
    });
});
