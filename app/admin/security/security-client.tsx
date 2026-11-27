'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AdminActionFeed } from '@/components/admin/AdminActionFeed';
import { ChartPanel, TimeSeriesChart } from '@/components/admin/charts';
import { KpiTile } from '@/components/admin/KpiTile';
import { SharedIpGroups } from '@/components/admin/SharedIpGroups';
import { formatDay } from '@/components/admin/UsersTable';
import { QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud/HudButton';
import { HudSegmented } from '@/components/hud/HudSegmented';
import { HudPanel } from '@/components/hud/page';
import { DAY_MS } from '@/lib/constants/time';
import { useAdminSecurity } from '@/lib/hooks/admin';
import type { AdminSecurity } from '@/types/admin';

const DAYS = [7, 30, 90] as const;

function actionsPerDay(actions: AdminSecurity['actions'], days: number, now: number) {
    const today = Math.floor(now / DAY_MS) * DAY_MS;

    const times = Array.from({ length: days }, (_, i) => today - (days - 1 - i) * DAY_MS);

    const values = times.map(() => 0);

    for (const a of actions) {
        const i = times.indexOf(Math.floor(Date.parse(a.at) / DAY_MS) * DAY_MS);

        if (i >= 0) values[i]++;
    }

    return { times, values };
}

export function SecurityClient() {
    const t = useTranslations('admin.security');

    const [days, setDays] = useState<(typeof DAYS)[number]>(30);

    const query = useAdminSecurity(days);

    const [now] = useState(() => Date.now());

    const chart = useMemo(
        () =>
            query.data
                ? actionsPerDay(query.data.actions, days, now)
                : null,
        [query.data, days, now]
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <HudSegmented
                    id="admin-security-days"
                    label={t('period')}
                    value={String(days)}
                    onValueChange={(v) => setDays(Number(v) as typeof days)}
                    options={DAYS.map((d) => ({
                        value: String(d),
                        label: t('daysOption', { n: d }),
                    }))}
                />
                <HudButton
                    className="px-3 py-1.5 text-sm"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                >
                    {t('refresh')}
                </HudButton>
            </div>
            <QueryState query={query}>
                {(data) => (
                    <>
                        {data.dataSince && (
                            <p className="text-sm text-hud-muted">
                                {t('dataSince', { date: data.dataSince })}
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <KpiTile
                                label={t('tiles.groups')}
                                value={data.groups.filter((g) => !g.crowd).length}
                            />
                            <KpiTile
                                label={t('tiles.crowd')}
                                value={data.groups.filter((g) => g.crowd).length}
                            />
                            <KpiTile
                                label={t('tiles.reRegistrations')}
                                value={
                                    data.hashConfigured
                                        ? data.reRegistrations.length
                                        : '—'
                                }
                            />
                            <KpiTile
                                label={t('tiles.actions')}
                                value={data.actions.length}
                            />
                        </div>
                        <HudPanel className="space-y-3">
                            <h2 className="hud-sc text-sm">{t('sharedIps')}</h2>
                            <SharedIpGroups groups={data.groups} />
                        </HudPanel>
                        <HudPanel className="space-y-3">
                            <h2 className="hud-sc text-sm">
                                {t('reRegistrations')}
                            </h2>
                            {data.reRegistrations.length ? (
                                <ul className="divide-y divide-hud-rule text-sm">
                                    {data.reRegistrations.map((r) => (
                                        <li
                                            key={r.userId}
                                            className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
                                        >
                                            <Link
                                                href={`/admin/users/${r.userId}`}
                                                className="underline"
                                            >
                                                {r.displayName} ({r.email})
                                            </Link>
                                            <span className="text-xs text-hud-muted">
                                                {t('reRegisteredAt', {
                                                    created: formatDay(
                                                        r.createdAt
                                                    ),
                                                    deleted: formatDay(
                                                        r.deletedAt
                                                    ),
                                                })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-hud-muted">
                                    {data.hashConfigured
                                        ? t('reRegistrationsEmpty')
                                        : t('hashNotConfigured')}
                                </p>
                            )}
                        </HudPanel>
                        {chart && data.actions.length > 0 && (
                            <ChartPanel title={t('actionsChart')}>
                                <TimeSeriesChart
                                    title={t('actionsChart')}
                                    times={chart.times}
                                    series={[
                                        {
                                            id: 'actions',
                                            label: t('tiles.actions'),
                                            values: chart.values,
                                        },
                                    ]}
                                    kind="bars"
                                    format={String}
                                    caption={t('actionsPerDay')}
                                    height={180}
                                />
                            </ChartPanel>
                        )}
                        <HudPanel className="space-y-3">
                            <h2 className="hud-sc text-sm">{t('actions')}</h2>
                            <AdminActionFeed actions={data.actions} />
                        </HudPanel>
                    </>
                )}
            </QueryState>
        </div>
    );
}
