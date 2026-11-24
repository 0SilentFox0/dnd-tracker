import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const warn = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/common/logger', () => ({
    logger: { warn, error: warn, info: warn, debug: warn },
}));

import { sendAlert } from '@/lib/server/ops/notify';

const msg = { title: 'T', body: 'B', severity: 'warn' as const };

const ENV = [
    'OPS_TELEGRAM_BOT_TOKEN',
    'OPS_TELEGRAM_CHAT_ID',
    'RESEND_API_KEY',
    'OPS_ALERT_EMAIL',
    'OPS_ALERT_FROM',
];

describe('sendAlert', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        for (const key of ENV) delete process.env[key];
        fetchMock.mockReset();
        warn.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        for (const key of ENV) delete process.env[key];
    });

    it('returns off for both channels without env', async () => {
        expect(await sendAlert(msg)).toEqual({ telegram: 'off', email: 'off' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends telegram and email', async () => {
        process.env.OPS_TELEGRAM_BOT_TOKEN = 'SECRET-TOKEN';
        process.env.OPS_TELEGRAM_CHAT_ID = '42';
        process.env.RESEND_API_KEY = 'SECRET-KEY';
        process.env.OPS_ALERT_EMAIL = 'a@example.com';
        process.env.OPS_ALERT_FROM = 'ops@example.com';
        fetchMock.mockResolvedValue({ ok: true });

        expect(await sendAlert(msg)).toEqual({ telegram: 'ok', email: 'ok' });

        const urls = fetchMock.mock.calls.map((call) => call[0]);

        expect(urls).toContain(
            'https://api.telegram.org/botSECRET-TOKEN/sendMessage'
        );
        expect(urls).toContain('https://api.resend.com/emails');
    });

    it('reports fail without throwing and never logs secrets', async () => {
        process.env.OPS_TELEGRAM_BOT_TOKEN = 'SECRET-TOKEN';
        process.env.OPS_TELEGRAM_CHAT_ID = '42';
        process.env.RESEND_API_KEY = 'SECRET-KEY';
        process.env.OPS_ALERT_EMAIL = 'a@example.com';
        process.env.OPS_ALERT_FROM = 'ops@example.com';
        fetchMock
            .mockRejectedValueOnce(new Error('boom SECRET-TOKEN'))
            .mockResolvedValueOnce({ ok: false });

        expect(await sendAlert(msg)).toEqual({
            telegram: 'fail',
            email: 'fail',
        });
        expect(warn).toHaveBeenCalled();
        expect(JSON.stringify(warn.mock.calls)).not.toMatch(/SECRET/);
    });
});
