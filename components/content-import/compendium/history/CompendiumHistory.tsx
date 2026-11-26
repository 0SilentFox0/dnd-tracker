'use client';
import { useTranslations } from 'next-intl';

import { PagerNav } from '@/components/common/shell/PagerNav';
import { FormAlert } from '@/components/common/states';
import { HudPanel, HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { useCompendiumReports } from '@/lib/hooks/compendium-import';

const SHORT_ID = 6;

export function CompendiumHistory({
    campaignId,
    wizard,
}: {
    campaignId: string;
    wizard: CompendiumImportController;
}) {
    const t = useTranslations('compendium');

    const { runs, pager, isError } = useCompendiumReports(campaignId);

    return (
        <HudPanel className="space-y-3">
            <h2 className="hud-sc text-base text-hud-ink">{t('runs.title')}</h2>
            {isError && <FormAlert>{t('runs.loadFailed')}</FormAlert>}
            <ul className="space-y-2">
                {runs.map((run) => {
                    const label = t('history.row', {
                        id: run.id.slice(0, SHORT_ID),
                    });

                    return (
                        <li
                            key={run.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-hud-raised"
                        >
                            <span className="min-w-0 text-sm">
                                {label}
                                {run.report && (
                                    <HudPill tone="muted" className="ml-2">
                                        {t('summary.records', {
                                            count:
                                                run.report.counts.created +
                                                run.report.counts.updated,
                                        })}
                                    </HudPill>
                                )}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                aria-label={`${t('history.open')}: ${label}`}
                                onClick={() => void wizard.actions.openRun(run)}
                            >
                                {t('history.open')}
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <PagerNav
                pager={pager}
                labels={{ prev: t('runs.prev'), next: t('runs.next') }}
            />
        </HudPanel>
    );
}
