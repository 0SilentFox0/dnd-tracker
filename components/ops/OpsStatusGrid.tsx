'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';

import { HudPanel } from '@/components/hud/page';
import { Badge } from '@/components/ui/badge';
import { PROVIDER_DASHBOARD_URLS } from '@/lib/ops/chart-groups';
import type { AlertStatus } from '@/lib/utils/ops/alert-state';
import { splitAge } from '@/lib/utils/ops/format';
import type { OpsSummary } from '@/types/ops';

const STATE_ICON = {
    ok: CheckCircle2,
    warn: AlertTriangle,
    crit: XCircle,
    unknown: CircleHelp,
} as const;

const STATE_TONE: Record<AlertStatus | 'unknown', string> = {
    ok: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    crit: 'text-red-600 dark:text-red-400',
    unknown: 'text-muted-foreground',
};

const SILENT_AFTER_SEC = 180;

export function OpsStatusGrid({ summary }: { summary: OpsSummary }) {
    const t = useTranslations('ops.status');

    const age = summary.heartbeatAgeSec;

    const silent = age === null || age > SILENT_AFTER_SEC;

    const parts = age === null ? null : splitAge(age);

    return (
        <section aria-labelledby="ops-status" className="space-y-3">
            <h2 id="ops-status" className="text-lg font-semibold">
                {t('title')}
            </h2>
            <p
                className={
                    silent
                        ? 'text-sm font-medium text-red-600 dark:text-red-400'
                        : 'text-sm text-muted-foreground'
                }
                data-testid="ops-heartbeat"
            >
                {parts
                    ? t('heartbeat', {
                          age: t(`age.${parts.unit}`, { value: parts.value }),
                      })
                    : t('heartbeatNever')}
            </p>
            {silent && (
                <p
                    role="alert"
                    className="text-sm font-medium text-red-600 dark:text-red-400"
                >
                    {t('collectorSilent')}
                </p>
            )}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {summary.providers.map((p) => {
                    const state = p.available
                        ? (p.status ?? 'unknown')
                        : 'unknown';

                    const Icon = STATE_ICON[state];

                    return (
                        <li key={p.name}>
                            <HudPanel as="div" className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">
                                        {t(`providers.${p.name}`)}
                                    </span>
                                    <Badge variant="outline">
                                        {t(`tier.${p.tier}`)}
                                    </Badge>
                                </div>
                                <div
                                    className={`flex items-center gap-1.5 text-sm ${STATE_TONE[state]}`}
                                >
                                    <Icon className="size-4" aria-hidden />
                                    <span>
                                        {p.available
                                            ? t(`state.${state}`)
                                            : t('unavailable')}
                                    </span>
                                </div>
                                {!p.available && (
                                    <a
                                        href={PROVIDER_DASHBOARD_URLS[p.name]}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="text-xs text-muted-foreground underline"
                                    >
                                        {t('openDashboard')}
                                    </a>
                                )}
                            </HudPanel>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
