'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

import { CompendiumCoverage } from './CompendiumCoverage';
import { CompendiumMediaSummary } from './CompendiumMediaSummary';
import {
    type BlockerActions,
    BlockerCard,
    Counts,
    DEPENDENCIES_ANCHOR,
    IssueGroupCard,
    RowCard,
} from './CompendiumReportCards';
import { SourceNotes } from './SourceNotes';

import { PagerNav } from '@/components/common/PagerNav';
import { HudChipTabs } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { COMPENDIUM_PAGE_SIZES } from '@/lib/constants/compendium-import';
import { usePager } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { downloadText } from '@/lib/utils/common/download-text';
import { destination } from '@/lib/utils/compendium-import/flow';
import {
    editionLabel,
    groupIssues,
    infoSummary,
    REPORT_ROW_FILTERS,
    sourceLabel,
    splitCategories,
    splitInfoIssues,
} from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

type Filter = keyof typeof REPORT_ROW_FILTERS;

export { DEPENDENCIES_ANCHOR };
export type { BlockerActions };

export function CompendiumReport({
    campaignId,
    report,
    committed = false,
    blockerActions,
}: {
    campaignId: string;
    report: Report;
    committed?: boolean;
    blockerActions?: BlockerActions;
}) {
    const t = useTranslator('compendium');

    const { actions: manualActions, info } = useMemo(
        () => splitInfoIssues(report.nextActions),
        [report.nextActions]
    );

    const blockers = useMemo(
        () =>
            groupIssues(
                t,
                manualActions.filter((issue) => issue.severity === 'error')
            ),
        [t, manualActions]
    );

    const groups = useMemo(
        () =>
            groupIssues(
                t,
                manualActions.filter((issue) => issue.severity !== 'error')
            ),
        [t, manualActions]
    );

    const categories = useMemo(
        () => splitCategories(report.countsByCategory),
        [report.countsByCategory]
    );

    const [filter, setFilter] = useState<Filter>(() =>
        report.rows.some(REPORT_ROW_FILTERS.changed) ||
        !report.rows.some(REPORT_ROW_FILTERS.manual)
            ? 'changed'
            : 'manual'
    );

    const visible = useMemo(
        () => report.rows.filter(REPORT_ROW_FILTERS[filter]),
        [report.rows, filter]
    );

    const rows = usePager(visible, COMPENDIUM_PAGE_SIZES.reportRows);

    const [notes, setNotes] = useState<{
        kind: string;
        targetId: string;
    } | null>(null);

    const actionLink = (code: string, path: string) =>
        destination(campaignId, {
            ...report.rows.find(
                (r) =>
                    path.startsWith(r.canonicalKey) ||
                    r.issues.some(
                        (owned) => owned.code === code && owned.path === path
                    )
            ),
            code,
        });

    const chips = (
        [
            ['changed', t('report.filterChanged')],
            ['manual', t('report.filterManual')],
            ['all', t('report.filterAll')],
        ] as const
    ).map(([key, label]) => ({
        key,
        label: `${label} (${report.rows.filter(REPORT_ROW_FILTERS[key]).length})`,
        active: filter === key,
        onSelect: () => setFilter(key),
    }));

    const hidden = report.rows.length - visible.length;

    return (
        <section
            className="space-y-4 text-sm break-words"
            aria-label={t('report.ariaLabel')}
        >
            <div className="space-y-3 rounded-xl border border-hud-line p-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p
                        className={`text-base font-semibold ${report.readyToImport ? 'text-hud-good' : 'text-hud-bad'}`}
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
            <Disclosure
                defaultOpen
                summary={
                    <span className="text-hud-gold">{t('report.sources')}</span>
                }
            >
                <ul className="text-hud-muted">
                    {report.sources.map((source, index) => (
                        <li key={index}>{sourceLabel(t, source)}</li>
                    ))}
                </ul>
                <p>
                    {Object.entries(report.editionSummary)
                        .map(([key, value]) =>
                            t('report.editionCount', {
                                edition: editionLabel(t, key),
                                count: value,
                            })
                        )
                        .join('; ')}
                </p>
            </Disclosure>
            <CompendiumCoverage categories={categories} />
            <div className="space-y-2">
                <h3 className="hud-sc text-base text-hud-ink">
                    {t('report.records')}
                </h3>
                <HudChipTabs
                    ariaLabel={t('report.filterLabel')}
                    items={chips}
                />
                <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {rows.pageItems.map((row, index) => (
                        <RowCard
                            key={`${row.canonicalKey}:${index}`}
                            row={row}
                            committed={committed}
                            onNotes={setNotes}
                            campaignId={campaignId}
                        />
                    ))}
                </ul>
                {visible.length === 0 && (
                    <p className="text-hud-muted">{t('report.noRows')}</p>
                )}
                {filter !== 'all' && hidden > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        {t('report.showUnchanged', { count: hidden })}
                    </Button>
                )}
                <PagerNav
                    ariaLabel={t('report.rowsPager')}
                    pager={rows}
                    labels={{
                        prev: t('report.rowsPrev'),
                        next: t('report.rowsNext'),
                    }}
                />
            </div>
            {groups.length > 0 && (
                <div className="space-y-2">
                    <h3 className="hud-sc text-base text-hud-ink">
                        {t('report.next')}
                    </h3>
                    <ul className="space-y-2">
                        {groups.map((group) => (
                            <IssueGroupCard
                                key={group.code}
                                group={group}
                                link={committed ? actionLink : undefined}
                            />
                        ))}
                    </ul>
                </div>
            )}
            {!committed && report.media && (
                <CompendiumMediaSummary media={report.media} />
            )}
            {info.length > 0 && (
                <p className="text-hud-muted">
                    {t('report.infoNote', { summary: infoSummary(t, info) })}
                </p>
            )}
            {report.omittedIssues > 0 && (
                <p>
                    {t('report.omitted', {
                        count: report.omittedIssues,
                        codes: Object.entries(report.issueCounts)
                            .map(([code, n]) =>
                                t('report.codeCount', { code, count: n })
                            )
                            .join('; '),
                    })}
                </p>
            )}
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
            {notes && <SourceNotes campaignId={campaignId} {...notes} />}
        </section>
    );
}
