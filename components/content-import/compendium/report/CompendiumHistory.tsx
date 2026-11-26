'use client';
import { useTranslations } from 'next-intl';

import { PagerNav } from '@/components/common/shell/PagerNav';
import { FormAlert } from '@/components/common/states';
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
        <section className="ds-panel space-y-3 p-4">
            <h2 className="hud-sc text-base text-hud-ink">
                {t('runs.title')}
            </h2>
            {isError && <FormAlert>{t('runs.loadFailed')}</FormAlert>}
            <ul className="space-y-1">
                {runs.map((run) => {
                    const counts = run.report?.counts;

                    return (
                        <li
                            key={run.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-hud-raised"
                        >
                            <span className="min-w-0 text-sm text-hud-ink">
                                {t('history.row', {
                                    id: run.id.slice(0, SHORT_ID),
                                })}
                                {counts && (
                                    <span className="text-hud-muted">
                                        {' · '}
                                        {t('summary.records')}:{' '}
                                        {counts.created +
                                            counts.updated +
                                            counts.unchanged}
                                    </span>
                                )}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
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
        </section>
    );
}
