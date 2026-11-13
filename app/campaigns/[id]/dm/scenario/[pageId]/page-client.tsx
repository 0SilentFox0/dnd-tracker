'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { BookOpen, ChevronsUpDown, History, Moon, Sun } from 'lucide-react';

import type { ActionsMenuItem } from '@/components/common/ActionsMenu';
import { LoadingState, QueryState } from '@/components/common/states';
import {
    ScenarioBar,
    ScenarioBook,
    type TocControl,
} from '@/components/scenario';
import { VersionsDialog } from '@/components/scenario/editor/VersionsDialog';
import { ScenarioAiPanel } from '@/components/scenario/page/ScenarioAiPanel';
import { ScenarioPageActions } from '@/components/scenario/page/ScenarioPageActions';
import { ScenarioPageContent } from '@/components/scenario/page/ScenarioPageContent';
import { ScenarioShowDock } from '@/components/scenario/play/ScenarioShowDock';
import { useMediaQuery } from '@/lib/hooks/common';
import {
    useGenerateScenarioSummary,
    useScenarioEditSession,
    useScenarioPage,
    useScenarioPageAi,
    useScenarioPlay,
    useSceneNeighbours,
    useSectionCollapse,
    useSectionProgress,
} from '@/lib/hooks/scenario';
import { useAppDark } from '@/lib/hooks/theme';
import { playedLookup } from '@/lib/utils/scenario/reveal';
import type { ScenarioPage } from '@/types/scenario';

const ScenarioEditor = dynamic(() => import('@/components/scenario/editor'), {
    ssr: false,
    loading: () => <LoadingState />,
});

type PlayedPages = { id: string; played: string[] }[];

export function ScenarioPageClient({
    campaignId,
    pageId,
    playedPages,
    aiEnabled,
    canEdit = true,
    isDemo = false,
}: {
    campaignId: string;
    pageId: string;
    playedPages: PlayedPages;
    aiEnabled: boolean;
    canEdit?: boolean;
    isDemo?: boolean;
}) {
    const query = useScenarioPage(campaignId, pageId);

    return (
        <QueryState query={query}>
            {(page) => (
                <ScenarioPageBody
                    campaignId={campaignId}
                    page={page}
                    playedPages={playedPages}
                    aiEnabled={aiEnabled}
                    canEdit={canEdit}
                    isDemo={isDemo}
                />
            )}
        </QueryState>
    );
}

function ScenarioPageBody({
    campaignId,
    page,
    playedPages,
    aiEnabled,
    canEdit,
    isDemo,
}: {
    campaignId: string;
    page: ScenarioPage;
    playedPages: PlayedPages;
    aiEnabled: boolean;
    canEdit: boolean;
    isDemo: boolean;
}) {
    const t = useTranslations('scenario.pageBody');

    const progress = useSectionProgress(campaignId, page.id);

    const summary = useGenerateScenarioSummary(campaignId);

    const collapse = useSectionCollapse();

    const neighbours = useSceneNeighbours(campaignId, page.id);

    const edit = useScenarioEditSession();

    const [hideNotes, setHideNotes] = useState(false);

    const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

    const [versionsOpen, setVersionsOpen] = useState(false);

    const [tocOpen, setTocOpen] = useState(false);

    const playEnabled =
        page.kind === 'scene' && !edit.base && (canEdit || isDemo);

    const play = useScenarioPlay(campaignId, page.content, playEnabled, {
        readOnly: !canEdit,
    });

    const ai = useScenarioPageAi(campaignId, page, {
        enabled: aiEnabled,
        playing: playEnabled,
        edit,
    });

    const wide = useMediaQuery('(min-width: 1200px)');

    const tocInline = wide && !ai.isOpen;

    const toc: TocControl = {
        inline: tocInline,
        drawer: { open: tocOpen, onOpenChange: setTocOpen },
    };

    const played = useMemo(() => playedLookup(playedPages), [playedPages]);

    const appDark = useAppDark();

    const dark = theme ? theme === 'dark' : appDark;

    const sceneLink = (p?: { id: string; title: string }) =>
        p
            ? {
                  href: `/campaigns/${campaignId}/dm/scenario/${p.id}`,
                  title: p.title,
              }
            : undefined;

    const menu: ActionsMenuItem[] = [
        {
            label: dark ? t('lightTheme') : t('darkTheme'),
            icon: dark ? Sun : Moon,
            onSelect: () => setTheme(dark ? 'light' : 'dark'),
        },
        ...(edit.base || !canEdit
            ? []
            : [
                  {
                      label: t('versions'),
                      icon: History,
                      onSelect: () => setVersionsOpen(true),
                  },
              ]),
        {
            label: collapse.showPlayed
                ? t('collapsePlayed')
                : t('expandPlayed'),
            icon: ChevronsUpDown,
            onSelect: () => collapse.setShowPlayed(!collapse.showPlayed),
        },
        {
            label: t('toIndex'),
            icon: BookOpen,
            href: `/campaigns/${campaignId}/dm/scenario`,
            separatorBefore: true,
        },
    ];

    return (
        <ScenarioBook
            hideNotes={hideNotes && !edit.base}
            theme={theme}
            withAi={ai.isOpen}
        >
            <ScenarioBar
                title={page.title}
                notes={{
                    hidden: hideNotes,
                    toggle: () => setHideNotes((v) => !v),
                }}
                toc={tocInline ? undefined : { onOpen: () => setTocOpen(true) }}
                nav={
                    page.kind === 'scene' && !edit.base
                        ? {
                              prev: sceneLink(neighbours.prev),
                              next: sceneLink(neighbours.next),
                          }
                        : undefined
                }
                actions={
                    <ScenarioPageActions
                        campaignId={campaignId}
                        page={page}
                        flags={{ canEdit, aiEnabled, editing: !!edit.base }}
                        summary={summary}
                        proposals={{ pendingCount: ai.proposals.pendingCount }}
                        on={{
                            edit: () => edit.start(page),
                            openAi: ai.openPanel,
                        }}
                    />
                }
                menu={menu}
            />
            {edit.base ? (
                <ScenarioEditor
                    key={edit.base.version}
                    campaignId={campaignId}
                    page={edit.base}
                    onExit={edit.stop}
                    onDraftReady={edit.onDraftReady}
                    toc={toc}
                />
            ) : (
                <ScenarioPageContent
                    campaignId={campaignId}
                    page={page}
                    canEdit={canEdit}
                    play={playEnabled ? play : undefined}
                    progress={progress}
                    played={played}
                    collapse={collapse}
                    toc={toc}
                />
            )}
            {playEnabled && (
                <ScenarioShowDock
                    campaignId={campaignId}
                    pageId={page.id}
                    content={page.content}
                    play={play}
                />
            )}
            {ai.isOpen && (
                <ScenarioAiPanel
                    campaignId={campaignId}
                    mode={ai.mode}
                    page={page}
                    focus={{ value: ai.focus, onClear: ai.clearFocus }}
                    proposals={{
                        data: ai.proposals,
                        showPending: ai.pendingShown,
                    }}
                    onClose={ai.close}
                />
            )}
            {versionsOpen && !edit.base && (
                <VersionsDialog
                    campaignId={campaignId}
                    pageId={page.id}
                    open
                    onOpenChange={setVersionsOpen}
                    onRestored={() => {}}
                />
            )}
        </ScenarioBook>
    );
}
