'use client';

import { type ReactNode, useCallback } from 'react';
import { useFormatter, useTranslations } from 'next-intl';

import { AiComposer } from './AiComposer';
import { AiMessageList } from './AiMessageList';
import { AssistantContextDisclosure } from './AssistantContextDisclosure';

import { LoadingState } from '@/components/common/states';
import {
    useAiChat,
    useAiThreadMessages,
    useAssistantContext,
    useAssistantEffects,
} from '@/lib/hooks/ai';
import type { AiChatMessage, AiFocus, AiThread } from '@/types/ai';

export type RenderProposal = (
    proposalId: string,
    helpers: { send?: (text: string) => void }
) => ReactNode;

interface ThreadChatProps {
    campaignId: string;
    thread: AiThread;
    focus?: AiFocus;
    focusLabel: string | null;
    renderProposal?: RenderProposal;
    actions: { onFinish: () => void; onClearFocus: () => void };
}

export function AiThreadChat({
    campaignId,
    thread,
    focus,
    focusLabel,
    renderProposal,
    actions,
}: ThreadChatProps) {
    const { query, messages } = useAiThreadMessages(campaignId, thread.id);

    if (query.isError)
        return (
            <p className="text-sm text-destructive">{query.error.message}</p>
        );

    if (!messages) return <LoadingState rows={2} />;

    return (
        <AiThreadChatBody
            key={thread.id}
            campaignId={campaignId}
            thread={thread}
            initialMessages={messages}
            focus={focus}
            focusLabel={focusLabel}
            renderProposal={renderProposal}
            actions={actions}
        />
    );
}

function AiThreadChatBody({
    campaignId,
    thread,
    initialMessages,
    focus,
    focusLabel,
    renderProposal,
    actions,
}: ThreadChatProps & { initialMessages: AiChatMessage[] }) {
    const t = useTranslations('ai');

    const format = useFormatter();

    const getFocus = useCallback(() => focus, [focus]);

    const context = useAssistantContext(
        campaignId,
        thread.id,
        focus,
        `${thread.provider}:${thread.model}`
    );

    const { consumeReceipt } = useAssistantEffects(campaignId);

    const chat = useAiChat({
        campaignId,
        thread,
        initialMessages,
        getFocus,
        getSessionContext: context.getSessionContext,
        onReceipt: consumeReceipt,
        onFinish: actions.onFinish,
    });

    const busy = chat.status === 'streaming' || chat.status === 'submitted';

    const redo = () => {
        void chat.recover();
    };

    return (
        <>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
                <AiMessageList
                    campaignId={campaignId}
                    messages={chat.messages}
                    error={chat.error?.message}
                    renderProposal={
                        renderProposal &&
                        ((id) =>
                            renderProposal(id, {
                                send: (text) => void context.requestSend(text),
                            }))
                    }
                    onRedo={redo}
                />
            </div>
            {chat.blockedUntil && (
                <p role="status" className="text-sm">
                    {t('panel.blockedUntil', {
                        time: format.dateTime(new Date(chat.blockedUntil), {
                            timeStyle: 'medium',
                        }),
                    })}
                </p>
            )}
            <AssistantContextDisclosure context={context} onSend={chat.send} />
            <AiComposer
                mode={thread.mode}
                busy={busy}
                focusLabel={focusLabel}
                actions={{
                    onSend: (text) => void context.requestSend(text),
                    onStop: chat.stop,
                    onClearFocus: actions.onClearFocus,
                }}
            />
        </>
    );
}
