'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { BreakdownChart } from '@/components/admin/BreakdownChart';
import { CohortTable } from '@/components/admin/CohortTable';
import { KpiTile } from '@/components/admin/KpiTile';
import { OverviewCharts } from '@/components/admin/OverviewCharts';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { HudSegmented } from '@/components/hud/HudSegmented';
import { useAdminOverview } from '@/lib/hooks/admin';
import { ADMIN_RANGES } from '@/lib/schemas/admin';
import type { AdminRange } from '@/types/admin';

const percent = (v: number | null, na: string) =>
    v === null ? na : `${Math.round(v * 100)}%`;

export function OverviewClient() {
    const t = useTranslations('admin');

    const [range, setRange] = useState<AdminRange>('30d');

    const query = useAdminOverview(range);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <HudSegmented
                    id="admin-range"
                    label={t('overview.range.label')}
                    value={range}
                    onValueChange={setRange}
                    options={ADMIN_RANGES.map((r) => ({
                        value: r,
                        label: t(`overview.range.${r}`),
                    }))}
                />
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('common.refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(data) => {
                    const na = t('common.na');

                    const hint = t('overview.vsPrevious');

                    const k = data.tiles;

                    return (
                        <>
                            {data.dataSince && (
                                <p className="text-sm text-hud-muted">
                                    {t('dataSince', { date: data.dataSince })}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                                <KpiTile
                                    label={t('overview.tiles.usersTotal')}
                                    value={k.usersTotal}
                                />
                                <KpiTile
                                    label={t('overview.tiles.usersNew')}
                                    value={k.usersNew.value}
                                    delta={k.usersNew.delta}
                                    hint={hint}
                                />
                                <KpiTile
                                    label={t('overview.tiles.usersDeleted')}
                                    value={k.usersDeleted.value}
                                    delta={k.usersDeleted.delta}
                                    hint={hint}
                                    invert
                                />
                                <KpiTile
                                    label={t('overview.tiles.netGrowth')}
                                    value={k.netGrowth}
                                />
                                <KpiTile
                                    label={t('overview.tiles.dau')}
                                    value={k.dau}
                                />
                                <KpiTile
                                    label={t('overview.tiles.wau')}
                                    value={k.wau}
                                />
                                <KpiTile
                                    label={t('overview.tiles.mau')}
                                    value={k.mau}
                                />
                                <KpiTile
                                    label={t('overview.tiles.stickiness')}
                                    value={percent(k.stickiness, na)}
                                />
                                <KpiTile
                                    label={t('overview.tiles.campaigns')}
                                    value={k.campaignsTotal}
                                />
                                <KpiTile
                                    label={t('overview.tiles.campaignsNew')}
                                    value={k.campaignsNew.value}
                                    delta={k.campaignsNew.delta}
                                    hint={hint}
                                />
                                <KpiTile
                                    label={t('overview.tiles.templates')}
                                    value={k.templatesTotal}
                                />
                                <KpiTile
                                    label={t('overview.tiles.battles')}
                                    value={k.battles.value}
                                    delta={k.battles.delta}
                                    hint={hint}
                                />
                                <KpiTile
                                    label={t('overview.tiles.withAiKey')}
                                    value={k.withAiKey}
                                />
                                <KpiTile
                                    label={t('overview.tiles.activation')}
                                    value={percent(k.activationRate, na)}
                                />
                                <KpiTile
                                    label={t('overview.tiles.revenue')}
                                    value={t(
                                        'overview.tiles.revenueNotConnected'
                                    )}
                                />
                            </div>
                            <OverviewCharts series={data.series} />
                            <CohortTable cohorts={data.cohorts} />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <BreakdownChart
                                    title={t('overview.breakdowns.locale')}
                                    rows={data.breakdowns.locale}
                                />
                                <BreakdownChart
                                    title={t('overview.breakdowns.system')}
                                    rows={data.breakdowns.system}
                                />
                                <BreakdownChart
                                    title={t('overview.breakdowns.country')}
                                    rows={data.breakdowns.country}
                                />
                            </div>
                        </>
                    );
                }}
            </QueryState>
        </div>
    );
}
