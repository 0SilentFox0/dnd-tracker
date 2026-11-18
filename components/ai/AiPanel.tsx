'use client';

import {
    type CSSProperties,
    type ReactNode,
    useState,
} from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';

import { ResizeHandle } from './AiResizeHandle';
import { AiThreadChat, type RenderProposal } from './AiThreadChat';
import { AiThreadHeader } from './AiThreadHeader';

import { EmptyState, LoadingState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
    type AiProvider,
    type AiThreadMode,
    LEGACY_THREAD_TITLE,
} from '@/lib/constants/ai';
import {
    useAiCredentials,
    useAiPanelWidth,
    useAiProposals,
    useAiThreads,
} from '@/lib/hooks/ai';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { focusLabelOf } from '@/lib/utils/ai/focus';
import type { AiFocus } from '@/types/ai';
import type { ScenarioPage } from '@/types/scenario';

export type { RenderProposal };

interface AiPanelProps {
    campaignId: string;
    mode: AiThreadMode;
    focus: { value?: AiFocus; page?: ScenarioPage; onClear: () => void };
    proposals?: {
        data?: ReturnType<typeof useAiProposals>;
        render?: RenderProposal;
        showPending?: boolean;
        review?: ReactNode;
    };
    campaignName?: string;
    embedded?: boolean;
    actions: { onClose: () => void };
}

export function AiPanel({
    campaignId,
    campaignName,
    embedded = false,
    mode,
    focus,
    proposals,
    actions,
}: AiPanelProps) {
    const t = useTranslations('ai');

    const tr = useTranslator('ai');

    const { value: focusValue, page, onClear: onClearFocus } = focus;

    const {
        data: proposalData,
        render: renderProposal,
        showPending = false,
        review,
    } = proposals ?? {};

    const desktop = useMediaQuery(DESKTOP_QUERY);

    const panel = useAiPanelWidth();

    const { query: credentialsQuery, credentials } = useAiCredentials();

    const {
        query: threadsQuery,
        threads: all,
        create,
        patch,
    } = useAiThreads(campaignId, page?.id);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const threads = all.filter(
        (t) => t.mode === mode && (page || t.scenarioPageId === null)
    );

    const thread =
        threads.find((t) => t.id === selectedId) ?? threads[0] ?? null;

    const providers = credentials.map((c) => c.provider);

    const createThread = async () => {
        const provider = providers[0];

        if (!provider) return;

        const created = await create({
            mode,
            scenarioPageId: page?.id ?? null,
            provider,
        });

        if (created) setSelectedId(created.id);
    };

    const { refetch } = threadsQuery;

    const onFinish = () => {
        proposalData?.refresh();

        if (thread && (!thread.title || thread.title === LEGACY_THREAD_TITLE))
            void refetch();
    };

    let body: ReactNode;

    if (credentialsQuery.isLoading || threadsQuery.isLoading) {
        body = <LoadingState rows={2} />;
    } else if (!providers.length && !thread) {
        body = (
            <EmptyState
                icon={KeyRound}
                title={t('panel.connect.title')}
                description={t('panel.connect.description')}
                action={
                    <Button asChild>
                        <Link href="/settings/ai">
                            {t('panel.connect.action')}
                        </Link>
                    </Button>
                }
            />
        );
    } else if (!thread) {
        body = (
            <EmptyState
                title={t('panel.noThreads', { mode: t(`modes.${mode}`) })}
            />
        );
    } else {
        body = (
            <AiThreadChat
                campaignId={campaignId}
                thread={thread}
                focus={focusValue}
                focusLabel={focusLabelOf(tr, page, focusValue)}
                renderProposal={renderProposal}
                actions={{ onFinish, onClearFocus }}
            />
        );
    }

    const content = (
        <div className="flex h-full min-h-0 flex-col gap-2">
            {campaignName && (
                <h1 className="font-semibold">
                    {t('panel.heading', { name: campaignName })}
                </h1>
            )}
            {providers.length || thread ? (
                <AiThreadHeader
                    campaignId={campaignId}
                    threads={threads}
                    thread={thread}
                    providers={providers}
                    actions={{
                        onSelect: setSelectedId,
                        onCreate: createThread,
                        onChangeModel: (provider: AiProvider, model?: string) =>
                            thread && patch(thread.id, { provider, model }),
                        onClose: actions.onClose,
                    }}
                />
            ) : null}
            {showPending &&
            !review &&
            renderProposal &&
            proposalData &&
            proposalData.pending.length ? (
                <section
                    className="max-h-[40%] space-y-2 overflow-y-auto"
                    aria-label={t('panel.proposals')}
                >
                    <h3 className="text-sm font-medium">
                        {t('panel.proposals')}
                    </h3>
                    {proposalData.pending.map((p) => (
                        <div key={p.id}>{renderProposal(p.id, {})}</div>
                    ))}
                </section>
            ) : null}
            {review}
            {body}
        </div>
    );

    if (embedded)
        return (
            <div className="@container flex h-full min-h-0 flex-col">
                {content}
            </div>
        );

    if (!desktop) {
        return (
            <ResponsiveDialog
                open
                onOpenChange={(open) => !open && actions.onClose()}
                title={t(`modes.${mode}`)}
                hud
            >
                <div className="h-[70dvh]">{content}</div>
            </ResponsiveDialog>
        );
    }

    return (
        <aside
            data-slot="ai-panel"
            aria-label={t('panel.ariaLabel')}
            style={
                {
                    '--ai-panel-w': `${panel.width}px`,
                    width: 'var(--ai-panel-w)',
                } as CSSProperties
            }
            className="@container fixed top-[var(--app-header-h)] right-0 bottom-0 z-40 flex flex-col border-l bg-background p-3 shadow-xl"
        >
            <ResizeHandle panel={panel} />
            {content}
        </aside>
    );
}
