'use client';
import {
    type BlockerActions,
    BlockerCard,
    Counts,
} from './CompendiumReportCards';

import { useTranslator } from '@/lib/i18n/use-translator';
import type { IssueGroup } from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

export function CompendiumVerdict({
    report,
    committed,
    blockers,
    blockerActions,
}: {
    report: Report;
    committed: boolean;
    blockers: IssueGroup[];
    blockerActions?: BlockerActions;
}) {
    const t = useTranslator('compendium');

    return (
        <div className="space-y-3">
            <div
                className={`ds-inset space-y-3 rounded-xl border p-3 ${report.readyToImport ? 'border-hud-accent' : 'border-hud-bad'}`}
            >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p
                        className={`text-base font-semibold ${report.readyToImport ? 'text-hud-accent-fg' : 'text-hud-bad'}`}
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
            {blockers.length > 0 && (
                <div
                    role="alert"
                    className="space-y-2 rounded-xl border border-hud-bad p-3"
                >
                    <h3 className="hud-sc text-base text-hud-bad">
                        {t('report.blockersTitle', {
                            count: blockers.reduce(
                                (sum, group) => sum + group.items.length,
                                0
                            ),
                        })}
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
        </div>
    );
}
