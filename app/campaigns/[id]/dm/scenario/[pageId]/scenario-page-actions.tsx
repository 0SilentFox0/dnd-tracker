'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, MessageSquare, RefreshCw } from 'lucide-react';

import { AiProposalBadge } from '@/components/ai';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorldMapLink } from '@/components/world/WorldMapLink';
import type { ScenarioPage } from '@/types/scenario';

type Props = {
    campaignId: string;
    page: ScenarioPage;
    flags: { canEdit: boolean; aiEnabled: boolean; editing: boolean };
    summary: {
        pendingPageId: string | null;
        generate: (pageId: string, force: boolean) => void;
    };
    proposals: { pendingCount: number };
    on: { edit: () => void; openAi: (showPending: boolean) => void };
};

// edit mode leaves through the editor's own "Done" button, which awaits the last save first
export function ScenarioPageActions({
    campaignId,
    page,
    flags,
    summary,
    proposals,
    on,
}: Props) {
    const t = useTranslations('scenario.pageBody');

    return (
        <>
            {!flags.editing && flags.canEdit && (
                <>
                    <button
                        type="button"
                        className="toggle is-primary"
                        onClick={on.edit}
                    >
                        {t('edit')}
                    </button>
                    <Link
                        className="toggle sb-hide-sm"
                        href={`/campaigns/${campaignId}/show`}
                        target="_blank"
                        rel="noopener"
                    >
                        {t('showScreen')}
                    </Link>
                    <WorldMapLink campaignId={campaignId} variant="toggle" />
                </>
            )}
            {flags.aiEnabled && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                className="toggle"
                                aria-label="AI"
                            >
                                AI{' '}
                                <ChevronDown
                                    className="ml-1 size-3.5"
                                    aria-hidden
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => on.openAi(false)}>
                                <MessageSquare aria-hidden /> {t('openAi')}
                            </DropdownMenuItem>
                            {page.kind === 'scene' && (
                                <DropdownMenuItem
                                    disabled={summary.pendingPageId === page.id}
                                    onSelect={() =>
                                        summary.generate(page.id, true)
                                    }
                                >
                                    {summary.pendingPageId === page.id ? (
                                        <Loader2
                                            className="animate-spin"
                                            aria-hidden
                                        />
                                    ) : (
                                        <RefreshCw aria-hidden />
                                    )}
                                    {t('refreshSummary')}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AiProposalBadge
                        count={proposals.pendingCount}
                        onClick={() => on.openAi(true)}
                    />
                </>
            )}
        </>
    );
}
