'use client';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { CompendiumCoverage } from './CompendiumCoverage';
import { CompendiumMediaSummary } from './CompendiumMediaSummary';
import {
    DEPENDENCIES_ANCHOR,
    IssueGroupCard,
    RowCard,
} from './CompendiumReportCards';
import { useReportIssues } from './useReportIssues';

import { PagerNav } from '@/components/common/shell/PagerNav';
import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { HudChipTabs } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { COMPENDIUM_PAGE_SIZES } from '@/lib/constants/compendium-import';
import { usePager } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import { destination } from '@/lib/utils/compendium-import/flow';
import {
    editionLabel,
    infoSummary,
    REPORT_ROW_FILTERS,
    sourceLabel,
    splitCategories,
} from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

type Filter = keyof typeof REPORT_ROW_FILTERS;

export type ReportTab = 'records' | 'deps' | 'sources' | 'media';

export function CompendiumReportTabs({
    campaignId,
    report,
    committed = false,
    initialTab,
    dependencies,
}: {
    campaignId: string;
    report: Report;
    committed?: boolean;
    initialTab?: ReportTab;
    dependencies?: { count: number; node: ReactNode };
}) {
    const t = useTranslator('compendium');

    const { groups, info } = useReportIssues(report);

    const categories = useMemo(
        () => splitCategories(report.countsByCategory),
        [report.countsByCategory]
    );

    const [tab, setTab] = useState<ReportTab>(
        initialTab === 'deps' && !dependencies
            ? 'records'
            : (initialTab ?? 'records')
    );

    useEffect(() => {
        const open = () => {
            if (window.location.hash === `#${DEPENDENCIES_ANCHOR}`)
                setTab('deps');
        };

        window.addEventListener('hashchange', open);

        return () => window.removeEventListener('hashchange', open);
    }, []);

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

    const media = !committed ? report.media : undefined;

    const tabs = [
        { key: 'records', label: t('check.tabs.records') },
        dependencies && {
            key: 'deps',
            label: `${t('check.tabs.deps')} (${dependencies.count})`,
        },
        { key: 'sources', label: t('check.tabs.sources') },
        media && {
            key: 'media',
            label: `${t('check.tabs.media')} (${media.queued})`,
        },
    ].filter((item) => !!item);

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
        <div className="space-y-3">
            <span id={DEPENDENCIES_ANCHOR} />
            <HudChipTabs
                ariaLabel={t('report.rows')}
                items={tabs.map((item) => ({
                    ...item,
                    active: item.key === tab,
                    onSelect: () => setTab(item.key as ReportTab),
                }))}
            />
            {tab === 'records' && (
                <div className="space-y-3">
                    <HudChipTabs
                        ariaLabel={t('report.filterLabel')}
                        items={chips}
                    />
                    <ul className="grid grid-cols-1 items-start gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
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
                                        link={
                                            committed ? actionLink : undefined
                                        }
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            {tab === 'deps' && dependencies?.node}
            {tab === 'sources' && (
                <div className="space-y-3">
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
                    <CompendiumCoverage categories={categories} />
                    {info.length > 0 && (
                        <p className="text-hud-muted">
                            {t('report.infoNote', {
                                summary: infoSummary(t, info),
                            })}
                        </p>
                    )}
                    {report.omittedIssues > 0 && (
                        <p>
                            {t('report.omitted', {
                                count: report.omittedIssues,
                                codes: Object.entries(report.issueCounts)
                                    .map(([code, n]) =>
                                        t('report.codeCount', {
                                            code,
                                            count: n,
                                        })
                                    )
                                    .join('; '),
                            })}
                        </p>
                    )}
                </div>
            )}
            {tab === 'media' && media && (
                <CompendiumMediaSummary media={media} />
            )}
            {notes && <SourceNotes campaignId={campaignId} {...notes} />}
        </div>
    );
}
