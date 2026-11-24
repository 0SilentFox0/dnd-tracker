import 'server-only';
import { logger } from '@/lib/utils/common/logger';

export type AlertPayload = {
    title: string;
    body: string;
    severity: 'warn' | 'crit' | 'ok';
};

export type ChannelResult = 'ok' | 'fail' | 'off';

export type NotifyResult = { telegram: ChannelResult; email: ChannelResult };

const TIMEOUT_MS = 5000;

async function post(url: string, init: RequestInit): Promise<boolean> {
    const response = await fetch(url, {
        ...init,
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return response.ok;
}

async function sendTelegram(msg: AlertPayload): Promise<ChannelResult> {
    const token = process.env.OPS_TELEGRAM_BOT_TOKEN;

    const chatId = process.env.OPS_TELEGRAM_CHAT_ID;

    if (!token || !chatId) return 'off';

    try {
        const ok = await post(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `${msg.title}\n${msg.body}`,
                }),
            }
        );

        if (!ok) logger.warn('ops notify: telegram rejected the message');

        return ok ? 'ok' : 'fail';
    } catch {
        logger.warn('ops notify: telegram request failed');

        return 'fail';
    }
}

async function sendEmail(msg: AlertPayload): Promise<ChannelResult> {
    const apiKey = process.env.RESEND_API_KEY;

    const to = process.env.OPS_ALERT_EMAIL;

    const from = process.env.OPS_ALERT_FROM;

    if (!apiKey || !to || !from) return 'off';

    try {
        const ok = await post('https://api.resend.com/emails', {
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

        if (!ok) logger.warn('ops notify: email provider rejected the message');

        return ok ? 'ok' : 'fail';
    } catch {
        logger.warn('ops notify: email request failed');

        return 'fail';
    }
}

export async function sendAlert(msg: AlertPayload): Promise<NotifyResult> {
    const [telegram, email] = await Promise.all([
        sendTelegram(msg),
        sendEmail(msg),
    ]);

    return { telegram, email };
}
