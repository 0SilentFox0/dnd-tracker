import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { supabaseAdapter } from '../supabase';
import { upstashAdapter } from '../upstash';
import { vercelAdapter } from '../vercel';

const ENV = [
    'OPS_SUPABASE_ACCESS_TOKEN',
    'OPS_SUPABASE_PROJECT_REF',
    'SUPABASE_API_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'OPS_UPSTASH_EMAIL',
    'OPS_UPSTASH_API_KEY',
    'OPS_UPSTASH_DB_ID',
    'OPS_VERCEL_TOKEN',
    'OPS_VERCEL_PROJECT_ID',
    'OPS_VERCEL_TEAM_ID',
];

const fetchMock = vi.fn();

beforeEach(() => {
    for (const key of ENV) delete process.env[key];
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV) delete process.env[key];
});

describe('supabase adapter', () => {
    const setEnv = () => {
        process.env.OPS_SUPABASE_ACCESS_TOKEN = 'sbp_secret';
        process.env.OPS_SUPABASE_PROJECT_REF = 'abcdefghijklmnopqrst';
    };

    it('is unavailable without env or with a malformed ref', async () => {
        expect(await supabaseAdapter.collect()).toBe('unavailable');

        setEnv();
        process.env.OPS_SUPABASE_PROJECT_REF = '../x';

        expect(await supabaseAdapter.collect()).toBe('unavailable');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads disk usage with a bearer token', async () => {
        setEnv();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                metrics: { fs_size_bytes: 100, fs_used_bytes: 40 },
            }),
        });

        expect(await supabaseAdapter.collect()).toEqual([
            { metric: 'disk_used_bytes', value: 40 },
            { metric: 'disk_size_bytes', value: 100 },
        ]);
        expect(fetchMock.mock.calls[0][0]).toContain('/config/disk/util');
        expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
            'Bearer sbp_secret'
        );
    });

    it('falls back to SUPABASE_API_TOKEN and the ref from the public URL', async () => {
        process.env.SUPABASE_API_TOKEN = 'sbp_fallback';
        process.env.NEXT_PUBLIC_SUPABASE_URL =
            'https://abcdefghijklmnopqrst.supabase.co';
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                metrics: { fs_size_bytes: 10, fs_used_bytes: 4 },
            }),
        });

        expect(await supabaseAdapter.collect()).toHaveLength(2);
        expect(fetchMock.mock.calls[0][0]).toContain('abcdefghijklmnopqrst');
        expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
            'Bearer sbp_fallback'
        );
    });

    it('is unavailable on HTTP errors, odd bodies and network failure', async () => {
        setEnv();
        fetchMock.mockResolvedValueOnce({ ok: false });
        expect(await supabaseAdapter.collect()).toBe('unavailable');

        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        expect(await supabaseAdapter.collect()).toBe('unavailable');

        fetchMock.mockRejectedValueOnce(new Error('boom'));
        expect(await supabaseAdapter.collect()).toBe('unavailable');
    });
});

describe('upstash adapter', () => {
    const setEnv = () => {
        process.env.OPS_UPSTASH_EMAIL = 'a@b.c';
        process.env.OPS_UPSTASH_API_KEY = 'key';
        process.env.OPS_UPSTASH_DB_ID = '11111111-2222-3333-4444-555555555555';
    };

    it('is unavailable without env', async () => {
        expect(await upstashAdapter.collect()).toBe('unavailable');
    });

    it('maps stats fields and sends basic auth', async () => {
        setEnv();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                total_monthly_requests: 1000,
                daily_net_commands: 50,
                current_storage: 2048,
            }),
        });

        expect(await upstashAdapter.collect()).toEqual([
            { metric: 'commands_month', value: 1000 },
            { metric: 'commands_day', value: 50 },
            { metric: 'storage_bytes', value: 2048 },
        ]);
        expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
            `Basic ${Buffer.from('a@b.c:key').toString('base64')}`
        );
    });

    it('is unavailable when no known field is present or the request fails', async () => {
        setEnv();
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        expect(await upstashAdapter.collect()).toBe('unavailable');

        fetchMock.mockRejectedValueOnce(new Error('boom'));
        expect(await upstashAdapter.collect()).toBe('unavailable');
    });
});

describe('vercel adapter', () => {
    const jsonl = (rows: object[]) =>
        rows.map((r) => JSON.stringify(r)).join('\n');

    it('is unavailable without a token', async () => {
        expect(await vercelAdapter.collect()).toBe('unavailable');
    });

    it('sums the cost of the configured project only', async () => {
        process.env.OPS_VERCEL_TOKEN = 't';
        process.env.OPS_VERCEL_PROJECT_ID = 'prj_1';
        process.env.OPS_VERCEL_TEAM_ID = 'team_1';
        fetchMock.mockResolvedValue({
            ok: true,
            text: async () =>
                jsonl([
                    { EffectiveCost: '1.5', Tags: { ProjectId: 'prj_1' } },
                    { EffectiveCost: '9', Tags: { ProjectId: 'prj_2' } },
                    { EffectiveCost: 0.5, Tags: { ProjectId: 'prj_1' } },
                ]) + '\n',
        });

        expect(await vercelAdapter.collect()).toEqual([
            { metric: 'cost_month_usd', value: 2 },
        ]);
        expect(fetchMock.mock.calls[0][0]).toContain('teamId=team_1');
    });

    it('treats costs_not_found (Hobby plan) as zero cost', async () => {
        process.env.OPS_VERCEL_TOKEN = 't';
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => '{"error":{"code":"costs_not_found"}}',
        });
        expect(await vercelAdapter.collect()).toEqual([
            { metric: 'cost_month_usd', value: 0 },
        ]);

        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            text: async () => '{"error":{"code":"not_found"}}',
        });
        expect(await vercelAdapter.collect()).toBe('unavailable');
    });

    it('is unavailable on malformed lines and network failure', async () => {
        process.env.OPS_VERCEL_TOKEN = 't';
        fetchMock.mockResolvedValueOnce({
            ok: true,
            text: async () => 'not json',
        });
        expect(await vercelAdapter.collect()).toBe('unavailable');

        fetchMock.mockRejectedValueOnce(new Error('boom'));
        expect(await vercelAdapter.collect()).toBe('unavailable');
    });
});
