import type { UIMessage } from 'ai';

import type { getAiRunRecovery } from '@/lib/api/ai';

type RecoveryState = Awaited<ReturnType<typeof getAiRunRecovery>>;

type Translate = (key: string, values?: Record<string, string>) => string;

export const freshestLease = (state: RecoveryState) =>
    state.runs
        .filter(
            (r) =>
                r.status !== 'running' && Date.parse(r.expiresAt) > Date.now()
        )
        .sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt))[0];

export const hasUncertainEffects = (state: RecoveryState) =>
    state.receipts.some(
        (r) => r.status === 'unknown' || r.effectsStatus === 'unknown'
    ) ||
    (state.intents ?? []).some(
        (i) => i.status === 'unknown' || i.status === 'executing'
    );

const textMessage = (id: string, text: string): UIMessage => ({
    id,
    role: 'assistant',
    parts: [{ type: 'text', text }],
});

/** Receipts remain visible even if Stop happened after a committed tool call. */
export const recoveryMessages = (
    state: RecoveryState,
    { t, campaignId }: { t: Translate; campaignId: string }
) => ({
    receipts: state.receipts.map((r) =>
        textMessage(
            `receipt-${r.id}`,
            t('chat.receipt', { id: r.id, status: r.status })
        )
    ),
    pending: (state.intents ?? []).map((i) =>
        textMessage(
            `intent-${i.id}`,
            t('chat.intentLine', {
                status: i.status,
                summary: i.summary,
                href: `/campaigns/${campaignId}/dm/assistant?intent=${i.id}`,
            })
        )
    ),
});
