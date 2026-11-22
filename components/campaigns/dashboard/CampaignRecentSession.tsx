'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';

import { HudPanel } from '@/components/hud/page';
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

    const date = session?.playedAt
        ? new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeZone: 'UTC',
          }).format(new Date(session.playedAt))
        : null;

    const base = `/campaigns/${campaignId}/dm/scenario`;

    return (
        <HudPanel data-tour="dashboard.recent-session">
            <h2 className="hud-sc mb-3 text-[13px] tracking-[.06em] text-hud-gold">
                {t('recentSession.title')}
            </h2>
            {session ? (
                <div className="space-y-1.5">
                    <h3 className="break-words font-semibold text-hud-ink">
                        {session.title}
                    </h3>
                    {session.subtitle && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-hud-bone">
                            {session.subtitle}
                        </p>
                    )}
                    {date && session.playedAt && (
                        <time
                            dateTime={session.playedAt}
                            className="inline-flex items-center gap-1 text-xs text-hud-muted"
                        >
                            <CalendarDays aria-hidden className="size-3.5" />
                            {date}
                        </time>
                    )}
                </div>
            ) : (
                <p className="text-sm text-hud-muted">
                    {t('recentSession.empty')}
                </p>
            )}
            <Link
                href={session ? `${base}/${session.id}` : base}
                className="mt-3 inline-flex min-h-8 items-center text-sm font-medium text-hud-gold underline-offset-4 hover:underline"
            >
                {session
                    ? t('recentSession.open')
                    : t('recentSession.openScenario')}
            </Link>
        </HudPanel>
    );
}
