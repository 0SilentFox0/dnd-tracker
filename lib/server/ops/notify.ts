import 'server-only';
import { fetchWithTimeout } from '@/lib/server/ops/fetch-with-timeout';
import { logger } from '@/lib/utils/common/logger';
import { type AlertMessage } from '@/lib/utils/ops/alert-message';

export type ChannelResult = 'ok' | 'fail' | 'off';

export type NotifyResult = { telegram: ChannelResult; email: ChannelResult };

const TIMEOUT_MS = 5000;

async function deliver(
    channel: string,
    url: string,
    init: RequestInit
): Promise<ChannelResult> {
    try {
        const response = await fetchWithTimeout(
            url,
            { ...init, method: 'POST' },
            TIMEOUT_MS
        );

        if (response.ok) return 'ok';

        logger.warn(`ops notify: ${channel} rejected the message`);
    } catch {
        logger.warn(`ops notify: ${channel} request failed`);
    }

    return 'fail';
}

async function sendTelegram(msg: AlertMessage): Promise<ChannelResult> {
    const token = process.env.OPS_TELEGRAM_BOT_TOKEN;

    const chatId = process.env.OPS_TELEGRAM_CHAT_ID;

    if (!token || !chatId) return 'off';

    return deliver(
        'telegram',
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `${msg.title}\n${msg.body}`,
            }),
        }
    );
}

async function sendEmail(msg: AlertMessage): Promise<ChannelResult> {
    const apiKey = process.env.RESEND_API_KEY;

    const to = process.env.OPS_ALERT_EMAIL;

    const from = process.env.OPS_ALERT_FROM;

    if (!apiKey || !to || !from) return 'off';

    return deliver('email', 'https://api.resend.com/emails', {
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject: msg.title,
            text: msg.body,
        }),
    });
}

export async function sendAlert(msg: AlertMessage): Promise<NotifyResult> {
    const [telegram, email] = await Promise.all([
        sendTelegram(msg),
        sendEmail(msg),
    ]);

    return { telegram, email };
}
