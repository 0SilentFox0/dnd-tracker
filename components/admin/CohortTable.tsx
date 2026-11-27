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
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-hud-muted">
                            <th className="py-1 pr-3 font-normal">
                                {t('cohort')}
                            </th>
                            <th className="py-1 pr-3 font-normal">
                                {t('size')}
                            </th>
                            {COHORT_WEEKS_AFTER.map((w) => (
                                <th key={w} className="py-1 pr-3 font-normal">
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
                                <td className="py-1 pr-3">{c.cohortWeek}</td>
                                <td className="py-1 pr-3">{c.size}</td>
                                {c.rates.map((r, i) => (
                                    <td
                                        key={COHORT_WEEKS_AFTER[i]}
                                        className="py-1 pr-3"
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
