'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, MapPin } from 'lucide-react';

import { HudPanel,HudPill } from '@/components/hud/page';
import type { DmDashboardData } from '@/types/campaigns';

export function CampaignRecentSession({
    campaignId,
    session,
}: {
    campaignId: string;
    session: DmDashboardData['latestSession'];
}) {
    const t = useTranslations('dashboard');

    const locale = useLocale();

    const date = session
        ? new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeZone: 'UTC',
          }).format(new Date(session.startedAt))
        : null;

    return (
        <HudPanel data-tour="dashboard.recent-session">
            <h2 className="hud-sc mb-3 flex items-baseline justify-between gap-2 text-[13px] tracking-[.06em] text-hud-gold">
                <span>{t('recentSession.title')}</span>
                {session && (
                    <HudPill tone={session.endedAt ? 'muted' : 'gold'}>
                        {session.endedAt
                            ? t('recentSession.ended')
                            : t('recentSession.active')}
                    </HudPill>
                )}
            </h2>
            {session ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="min-w-0 break-words font-semibold text-hud-ink">
                            {session.name}
                        </h3>
                        <time
                            dateTime={session.startedAt}
                            className="inline-flex shrink-0 items-center gap-1 text-xs text-hud-muted"
                        >
                            <CalendarDays
                                aria-hidden
                                className="size-3.5"
                            />
                            {date}
                        </time>
                    </div>
                    {session.description && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-hud-bone">
                            {session.description}
                        </p>
                    )}
                    {session.locations.length > 0 && (
                        <ul className="space-y-1 border-t border-hud-rule pt-2">
                            {session.locations.map((location, index) => (
                                <li
                                    key={`${location}-${index}`}
                                    className="flex min-w-0 items-center gap-2 text-sm text-hud-bone"
                                >
                                    <MapPin
                                        aria-hidden
                                        className="size-3.5 shrink-0 text-hud-gold"
                                    />
                                    <span className="truncate">{location}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <p className="text-sm text-hud-muted">
                    {t('recentSession.empty')}
                </p>
            )}
            <Link
                href={`/campaigns/${campaignId}/dm/world`}
                className="mt-3 inline-flex min-h-8 items-center text-sm font-medium text-hud-gold underline-offset-4 hover:underline"
            >
                {t('recentSession.openWorld')}
            </Link>
        </HudPanel>
    );
}
