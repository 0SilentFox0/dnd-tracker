'use client';

import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';
import { COHORT_WEEKS_AFTER, type CohortRow } from '@/lib/utils/admin/cohorts';

export function CohortTable({ cohorts }: { cohorts: CohortRow[] }) {
    const t = useTranslations('admin.overview.cohorts');

    return (
        <HudPanel className="space-y-2">
            <h3 className="hud-sc text-sm">{t('title')}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-base">
                    <thead>
                        <tr className="text-left text-hud-muted">
                            <th className="px-3 py-2.5 text-base font-medium text-hud-muted">
                                {t('cohort')}
                            </th>
                            <th className="px-3 py-2.5 text-base font-medium text-hud-muted">
                                {t('size')}
                            </th>
                            {COHORT_WEEKS_AFTER.map((w) => (
                                <th
                                    key={w}
                                    className="px-3 py-2.5 text-base font-medium text-hud-muted"
                                >
                                    {t('week', { n: w })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cohorts.map((c) => (
                            <tr
                                key={c.cohortWeek}
                                className="border-t border-hud-line"
                            >
                                <td className="px-3 py-2.5 tabular-nums">
                                    {c.cohortWeek}
                                </td>
                                <td className="px-3 py-2.5 tabular-nums">
                                    {c.size}
                                </td>
                                {c.rates.map((r, i) => (
                                    <td
                                        key={COHORT_WEEKS_AFTER[i]}
                                        className="px-3 py-2.5 tabular-nums"
                                    >
                                        {r === null
                                            ? '—'
                                            : `${Math.round(r * 100)}%`}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </HudPanel>
    );
}
