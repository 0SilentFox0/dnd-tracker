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
            <h2 className="hud-sc mb-3 text-[13px] tracking-[.06em] text-hud-ink">
                {t('recentSession.title')}
            </h2>
            {session ? (
                <div className="space-y-1.5">
                    <h3 className="break-words font-semibold text-hud-ink">
                        <Link
                            href={`${base}/${session.id}`}
                            className="underline-offset-4 hover:underline"
                        >
                            {session.title}
                        </Link>
                    </h3>
                    {session.subtitle && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-hud-bone">
                            {session.subtitle}
                        </p>
                    )}
                    {session.lastChapter && (
                        <p className="text-sm text-hud-bone">
                            <span className="text-hud-muted">
                                {t('recentSession.lastChapter')}:{' '}
                            </span>
                            {session.lastChapter.title}
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
            {session?.nextChapter && (
                <Link
                    href={`${base}/${session.id}#sec-${session.nextChapter.id}`}
                    className="mt-3 flex min-h-10 items-center justify-between gap-2 rounded-lg bg-hud-page/45 px-3 text-sm text-hud-ink shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] transition-colors hover:bg-hud-raised"
                >
                    <span className="min-w-0 truncate">
                        <span className="text-hud-muted">
                            {t('recentSession.nextChapter')}:{' '}
                        </span>
                        {session.nextChapter.title}
                    </span>
                    <span aria-hidden>→</span>
                </Link>
            )}
            {!session && (
                <Link
                    href={base}
                    className="mt-3 inline-flex min-h-8 items-center text-sm font-medium text-hud-crimson-fg underline-offset-4 hover:underline"
                >
                    {t('recentSession.openScenario')}
                </Link>
            )}
        </HudPanel>
    );
}
