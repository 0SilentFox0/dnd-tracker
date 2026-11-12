'use client';

import { useTranslations } from 'next-intl';

import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import {
    ScenarioLayout,
    ScenarioPageView,
    ScenarioSummaryPanel,
    ScenarioToc,
    type TocControl,
    tocItems,
} from '@/components/scenario';
import type {
    ScenarioPlay,
    SectionCollapse,
    useSectionProgress,
} from '@/lib/hooks/scenario';
import type { ScenarioPage } from '@/types/scenario';

type Props = {
    campaignId: string;
    page: ScenarioPage;
    canEdit: boolean;
    play: ScenarioPlay | undefined;
    progress: ReturnType<typeof useSectionProgress>;
    played: Parameters<typeof tocItems>[2];
    collapse: SectionCollapse;
    toc: TocControl;
};

function SummarySection({
    campaignId,
    pageId,
}: {
    campaignId: string;
    pageId: string;
}) {
    const t = useTranslations('scenario.summary');

    return (
        <>
            <OnboardingHint id="dm.summaries" className="mb-3 text-left" />
            <details className="mb-4 rounded-lg border bg-card/75 p-3">
                <summary className="cursor-pointer text-sm font-medium">
                    {t('title')}
                </summary>
                <div className="mt-3">
                    <ScenarioSummaryPanel
                        campaignId={campaignId}
                        pageId={pageId}
                    />
                </div>
            </details>
        </>
    );
}

export function ScenarioPageContent({
    campaignId,
    page,
    canEdit,
    play,
    progress,
    played,
    collapse,
    toc,
}: Props) {
    const t = useTranslations('scenario.pageBody');

    return (
        <ScenarioLayout
            toc={
                <ScenarioToc
                    items={tocItems(
                        page.content.sections,
                        page.kind === 'hero',
                        played
                    )}
                    {...toc}
                    onPick={collapse.expand}
                />
            }
        >
            {canEdit && page.kind === 'scene' && (
                <SummarySection campaignId={campaignId} pageId={page.id} />
            )}
            <ScenarioPageView
                page={page}
                campaignId={campaignId}
                play={play}
                progress={
                    canEdit
                        ? {
                              onPlayed: (id, v) => {
                                  collapse.expand(id);
                                  void progress
                                      .setPlayed(id, v)
                                      .catch(() => {});
                              },
                              onRevealed: (id, v) => {
                                  collapse.expand(id);
                                  void progress
                                      .setRevealed(id, v)
                                      .catch(() => {});
                              },
                              pending: progress.isPending,
                              played,
                          }
                        : undefined
                }
                collapse={collapse}
            />
            {!canEdit && (
                <aside className="mt-4 rounded-lg border border-hud-gold/40 bg-hud-panel/70 p-3 text-sm text-hud-muted">
                    {t('demoPlaybackReadOnly')}
                </aside>
            )}
        </ScenarioLayout>
    );
}
