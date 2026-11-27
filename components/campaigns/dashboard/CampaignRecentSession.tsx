'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';

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
        <section
            className="border-hud-rule border-b pb-4"
            data-tour="dashboard.recent-session"
        >
            <h2 className="hud-sc text-hud-ink mb-3 text-sm tracking-[.06em]">
                {t('recentSession.title')}
            </h2>
            {session ? (
                <div className="space-y-1.5">
                    <h3 className="text-hud-ink break-words font-semibold">
                        <Link
                            href={`${base}/${session.id}`}
                            className="underline-offset-4 hover:underline"
                        >
                            {session.title}
                        </Link>
                    </h3>
                    {session.subtitle && (
                        <p className="text-hud-bone line-clamp-2 text-sm leading-relaxed">
                            {session.subtitle}
                        </p>
                    )}
                    {session.lastChapter && (
                        <p className="text-hud-bone text-sm">
                            <span className="text-hud-muted">
                                {t('recentSession.lastChapter')}:{' '}
                            </span>
                            {session.lastChapter.title}
                        </p>
                    )}
                    {date && session.playedAt && (
                        <time
                            dateTime={session.playedAt}
                            className="text-hud-muted inline-flex items-center gap-1 text-xs"
                        >
                            <CalendarDays aria-hidden className="size-3.5" />
                            {date}
                        </time>
                    )}
                </div>
            ) : (
                <p className="text-hud-muted text-sm">
                    {t('recentSession.empty')}
                </p>
            )}
            {session?.nextChapter && (
                <Link
                    href={`${base}/${session.id}#sec-${session.nextChapter.id}`}
                    className="bg-hud-page/45 text-hud-ink hover:bg-hud-raised mt-3 flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm shadow-[inset_0_0_0_1px_var(--color-hud-edge-faint)] transition-colors"
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
                    className="text-hud-accent-fg mt-3 inline-flex min-h-8 items-center text-sm font-medium underline-offset-4 hover:underline"
                >
                    {t('recentSession.openScenario')}
                </Link>
            )}
        </section>
    );
}
