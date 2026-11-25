'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OpsAlertsResponse, OpsMuteMinutes } from '@/types/ops';

const BADGE = {
    ok: 'secondary',
    warn: 'outline',
    crit: 'destructive',
} as const;

export function AlertList({
    alerts,
    onMute,
    pending = false,
}: {
    alerts: OpsAlertsResponse;
    onMute: (rule: string, minutes: OpsMuteMinutes) => void;
    pending?: boolean;
}) {
    const t = useTranslations('ops.alerts');

    const format = useFormatter();

    const active = alerts.rules.filter((r) => r.status !== 'ok');

    const mutedLabel = (iso: string) =>
        t('mutedUntil', {
            time: format.dateTime(new Date(iso), {
                dateStyle: 'short',
                timeStyle: 'short',
            }),
        });

    return (
        <section aria-labelledby="ops-alerts" className="space-y-4">
            <h2 id="ops-alerts" className="text-lg font-semibold">
                {t('title')}
            </h2>
            <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('active')}</h3>
                {active.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('noActive')}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {active.map((r) => (
                            <li
                                key={r.id}
                                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={BADGE[r.status]}>
                                            {t(`status.${r.status}`)}
                                        </Badge>
                                        <code className="text-xs">{r.id}</code>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {r.note}
                                    </p>
                                    {r.silencedUntil && (
                                        <p className="text-xs text-muted-foreground">
                                            {mutedLabel(r.silencedUntil)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {r.silencedUntil ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={pending}
                                            onClick={() => onMute(r.id, 0)}
                                        >
                                            {t('unmute')}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={pending}
                                                onClick={() => onMute(r.id, 60)}
                                            >
                                                {t('mute1h')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={pending}
                                                onClick={() =>
                                                    onMute(r.id, 1440)
                                                }
                                            >
                                                {t('mute24h')}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('history')}</h3>
                {alerts.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('noHistory')}
                    </p>
                ) : (
                    <ul className="divide-y rounded-lg border text-sm">
                        {alerts.events.map((e) => (
                            <li
                                key={e.id}
                                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
                            >
                                <time
                                    className="text-xs text-muted-foreground"
                                    dateTime={e.at}
                                >
                                    {format.dateTime(new Date(e.at), {
                                        dateStyle: 'short',
                                        timeStyle: 'medium',
                                    })}
                                </time>
                                <code className="text-xs">{e.rule}</code>
                                <span>
                                    {t('transition', {
                                        from: t(`status.${e.from}`),
                                        to: t(`status.${e.to}`),
                                    })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {e.notified ? t('notified') : t('silent')}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
