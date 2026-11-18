'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

import { ASSISTANT_POLLING } from './assistant-polling';
import {
    freshestLease,
    hasUncertainEffects,
    recoveryMessages,
} from './recovery-state';

import {
    cancelAiRun,
    createAiChatTransport,
    getAiRunRecovery,
} from '@/lib/api/ai';
import { useExpiry, usePageHidden } from '@/lib/hooks/common';
import { fromJson } from '@/lib/utils/common/json';
import type {
    AiChatMessage,
    AiFocus,
    AiThread,
    AssistantSessionContext,
} from '@/types/ai';

interface Params {
    campaignId: string;
    thread: AiThread;
    initialMessages: AiChatMessage[];
    getFocus: () => AiFocus | undefined;
    onFinish?: () => void;
    getSessionContext?: () => AssistantSessionContext;
    onReceipt?: (
        receipt: import('@/types/assistant').ReceiptDto
    ) => Promise<void>;
}

export function useAiChat({
    campaignId,
    thread,
    initialMessages,
    getFocus,
    getSessionContext,
    onReceipt,
    onFinish,
}: Params) {
    const t = useTranslations('ai');

    const focusRef = useRef(getFocus);

    const contextRef = useRef(getSessionContext);

    const receiptRef = useRef(onReceipt);

    const tRef = useRef(t);

    useEffect(() => {
        contextRef.current = getSessionContext;
        receiptRef.current = onReceipt;
        tRef.current = t;
    }, [getSessionContext, onReceipt, t]);

    const activeRequest = useRef<string | null>(null);

    const sending = useRef(false);

    const localStream = useRef(false);

    const epoch = useRef(0);

    const leaseRef = useRef(0);

    const uncertainRef = useRef(false);

    const streamOk = useRef(false);

    const [lease, setLease] = useState<string | null>(null);

    const leaseExpired = useExpiry(lease);

    const blockedUntil = leaseExpired ? null : lease;

    const hidden = usePageHidden();

    const [recovering, setRecovering] = useState(false);

    const [recoveryError, setRecoveryError] = useState<Error>();

    useEffect(() => {
        focusRef.current = getFocus;
    }, [getFocus]);

    const transport = useMemo(
        () =>
            createAiChatTransport(
                campaignId,
                thread.id,
                () => focusRef.current(),
                () => contextRef.current?.() ?? { sourceNoteKeys: [] }
            ),
        [campaignId, thread.id]
    );

    const chat = useChat({
        id: thread.id,
        messages: fromJson<UIMessage[]>(initialMessages),
        transport,
        onFinish: ({ isAbort, isDisconnect, isError }) => {
            streamOk.current = !isAbort && !isDisconnect && !isError;
        },
    });

    const { setMessages } = chat;

    const recover = useCallback(
        async (options?: {
            statusOnly?: boolean;
            afterStream?: boolean;
        }): Promise<void> => {
            if (localStream.current) return;

            const snapshotEpoch = epoch.current;

            const statusOnly = options?.statusOnly ?? false;

            try {
                const state = await (statusOnly
                    ? getAiRunRecovery(campaignId, thread.id, undefined, {
                          statusOnly,
                      })
                    : getAiRunRecovery(campaignId, thread.id));

                if (snapshotEpoch !== epoch.current || localStream.current)
                    return;

                if (
                    statusOnly &&
                    !options?.afterStream &&
                    !state.runs.some((r) => r.status === 'running')
                )
                    return recover();

                for (const receipt of state.receipts) {
                    const result = receipt.result;

                    if (
                        result &&
                        typeof result === 'object' &&
                        'affected' in result &&
                        Array.isArray(result.affected)
                    )
                        await receiptRef.current?.(
                            receipt as import('@/types/assistant').ReceiptDto
                        );
                }

                const running = state.runs.find((r) => r.status === 'running');

                const lease = freshestLease(state);

                leaseRef.current = lease ? Date.parse(lease.expiresAt) : 0;
                uncertainRef.current = hasUncertainEffects(state);
                setLease(lease?.expiresAt ?? null);
                activeRequest.current = running?.requestId ?? null;
                sending.current = !!running;
                setRecovering(!!running);

                if (statusOnly) {
                    setRecoveryError(undefined);

                    return;
                }

                const { receipts, pending } = recoveryMessages(state, {
                    t: tRef.current,
                    campaignId,
                });

                setMessages([
                    ...fromJson<UIMessage[]>(state.messages ?? []),
                    ...receipts,
                    ...pending,
                ]);
                setRecoveryError(undefined);
            } catch {
                setRecoveryError(new Error(tRef.current('chat.recoverFailed')));
            }
        },
        [campaignId, thread.id, setMessages]
    );

    useEffect(() => {
        void recover();

        const onReconnect = () => void recover();

        window.addEventListener('online', onReconnect);

        return () => window.removeEventListener('online', onReconnect);
    }, [recover]);
    useEffect(() => {
        if (!recovering || hidden) return;

        let delay: number = ASSISTANT_POLLING.recoveryMs;

        let timer: ReturnType<typeof setTimeout> | undefined;

        let cancelled = false;

        const tick = () => {
            timer = setTimeout(async () => {
                await recover({ statusOnly: true });

                delay = Math.min(delay * 2, ASSISTANT_POLLING.recoveryMaxMs);

                if (!cancelled) tick();
            }, delay);
        };

        tick();

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [recovering, hidden, recover]);

    const send = async (text: string) => {
        if (sending.current) return;

        if (leaseRef.current > Date.now() || uncertainRef.current) {
            setRecoveryError(new Error(t('chat.leaseBlocked')));

            return;
        }

        sending.current = true;
        localStream.current = true;
        streamOk.current = false;
        epoch.current++;

        const requestId = crypto.randomUUID();

        activeRequest.current = requestId;
        try {
            await chat.sendMessage({
                id: requestId,
                role: 'user',
                parts: [{ type: 'text', text }],
            });
        } finally {
            localStream.current = false;
            sending.current = false;

            if (streamOk.current)
                await recover({ statusOnly: true, afterStream: true });
            else await recover();

            onFinish?.();
        }
    };

    const stop = async () => {
        const requestId = activeRequest.current;

        await chat.stop();
        localStream.current = false;

        if (requestId) {
            try {
                await cancelAiRun(campaignId, thread.id, requestId);
            } catch {
                setRecoveryError(new Error(t('chat.stopFailed')));
            }
        }

        await recover();
    };

    return {
        blockedUntil,
        messages: chat.messages,
        send,
        stop,
        recover: () => recover(),
        status: recovering ? ('streaming' as const) : chat.status,
        error: recoveryError ?? chat.error,
    };
}
