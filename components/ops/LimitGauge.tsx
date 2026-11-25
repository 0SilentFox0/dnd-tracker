'use client';

import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';
import { formatValue } from '@/lib/utils/ops/format';
import type ops from '@/messages/uk/ops.json';
import type { OpsLimitRow } from '@/types/ops';

const BAR_TONE = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    crit: 'bg-red-500',
} as const;

export function LimitGauge({ row }: { row: OpsLimitRow }) {
    const t = useTranslations('ops.limits');

    const percent = row.percent === null ? null : Math.round(row.percent * 100);

    return (
        <HudPanel as="div" className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                    {t(
                        `names.${row.id.replaceAll('.', '_') as keyof typeof ops.limits.names}`
                    )}
                </span>
                <span className="text-xs text-muted-foreground">
                    {t(`period.${row.period}`)}
                </span>
            </div>
            {percent === null || row.value === null || row.limit === null ? (
                <p className="text-sm text-muted-foreground">{t('na')}</p>
            ) : (
                <>
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(percent, 100)}
                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className={`h-full ${BAR_TONE[row.status ?? 'ok']}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span>{t('percent', { percent })}</span>
                        <span className="text-xs text-muted-foreground">
                            {t('used', {
                                value: formatValue(row.value, row.unit),
                                limit: formatValue(row.limit, row.unit),
                            })}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {percent >= 100
                            ? t('reached')
                            : row.forecastHours === null
                              ? t('noForecast')
                              : t('forecast', {
                                    hours:
                                        Math.round(row.forecastHours * 10) / 10,
                                })}
                    </p>
                </>
            )}
        </HudPanel>
    );
}
