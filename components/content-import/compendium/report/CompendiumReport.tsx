'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';

import {
    type BlockerActions,
    DEPENDENCIES_ANCHOR,
} from './CompendiumReportCards';
import { CompendiumReportTabs, type ReportTab } from './CompendiumReportTabs';
import { CompendiumVerdict } from './CompendiumVerdict';
import { useReportIssues } from './useReportIssues';

import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n/use-translator';
import { downloadText } from '@/lib/utils/common/download-text';
import type { CompendiumReport as Report } from '@/types/compendium-import';

export { DEPENDENCIES_ANCHOR };
export type { BlockerActions };

export function CompendiumReport({
    campaignId,
    report,
    committed = false,
    blockerActions,
    dependencies,
    initialTab,
}: {
    campaignId: string;
    report: Report;
    committed?: boolean;
    blockerActions?: BlockerActions;
    dependencies?: { count: number; node: ReactNode };
    initialTab?: ReportTab;
}) {
    const t = useTranslator('compendium');

    const { blockers } = useReportIssues(report);

    return (
        <section
            className="space-y-4 text-sm break-words"
            aria-label={t('report.ariaLabel')}
        >
            <CompendiumVerdict
                report={report}
                committed={committed}
                blockers={blockers}
                blockerActions={blockerActions}
            />
            <CompendiumReportTabs
                campaignId={campaignId}
                report={report}
                committed={committed}
                dependencies={dependencies}
                initialTab={
                    initialTab ?? (blockers.length > 0 ? 'deps' : undefined)
                }
            />
            <p>{t('report.backstories')}</p>
            <Button
                variant="outline"
                className="h-auto whitespace-normal"
                asChild
            >
                <Link href={`/campaigns/${campaignId}/dm/characters`}>
                    {t('report.createCharacters')}
                </Link>
            </Button>
            <p>{t('report.dmMaterials')}</p>
            <Button
                variant="outline"
                onClick={() =>
                    downloadText(
                        `compendium-report-${report.runId ?? 'preview'}.json`,
                        JSON.stringify(report, null, 2),
                        'application/json'
                    )
                }
            >
                {t('report.download')}
            </Button>
        </section>
    );
}
