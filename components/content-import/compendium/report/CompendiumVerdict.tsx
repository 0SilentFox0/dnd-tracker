'use client';
import { useMemo } from 'react';

import {
    type BlockerActions,
    BlockerCard,
    Counts,
} from './CompendiumReportCards';

import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';
import {
    groupIssues,
    splitInfoIssues,
} from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

export function CompendiumVerdict({
    report,
    blockerActions,
    committed = false,
}: {
    report: Report;
    blockerActions?: BlockerActions;
    committed?: boolean;
}) {
    const t = useTranslator('compendium');

    const blockers = useMemo(
        () =>
            groupIssues(
                t,
                splitInfoIssues(report.nextActions).actions.filter(
                    (issue) => issue.severity === 'error'
                )
            ),
        [t, report.nextActions]
    );

    const blockerCount = blockers.reduce(
        (sum, group) => sum + group.items.length,
        0
    );

    return (
        <section
            className="space-y-3 text-sm break-words"
            aria-label={t('report.ariaLabel')}
        >
            <div
                className={cn(
                    'ds-panel space-y-3 border-l-4 p-3',
                    report.readyToImport
                        ? 'border-l-hud-accent'
                        : 'border-l-hud-bad'
                )}
            >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p
                        className={cn(
                            'text-base font-semibold',
                            report.readyToImport
                                ? 'text-hud-good'
                                : 'text-hud-bad'
                        )}
                    >
                        {t(
                            report.readyToImport
                                ? committed
                                    ? 'report.imported'
                                    : 'report.canImport'
                                : 'report.blocked'
                        )}
                    </p>
                    <p className="text-hud-muted">
                        {t(
                            report.readyToPlay
                                ? 'report.playReady'
                                : 'report.manualNeeded'
                        )}
                    </p>
                </div>
                <Counts counts={report.counts} />
            </div>
            {blockerCount > 0 && (
                <div
                    role="alert"
                    className="space-y-2 rounded-xl border border-hud-bad p-3"
                >
                    <h3 className="hud-sc text-base text-hud-bad">
                        {t('report.blockersTitle', { count: blockerCount })}
                    </h3>
                    <ul className="space-y-2">
                        {blockers.map((group) => (
                            <BlockerCard
                                key={group.code}
                                group={group}
                                actions={blockerActions}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
