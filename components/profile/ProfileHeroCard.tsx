'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AvatarEditor } from '@/components/profile/AvatarEditor';
import type { SessionUser } from '@/lib/hooks/auth';
import type { ProfileSummary } from '@/lib/server/profile/summary';
import { formatRelativeDays } from '@/lib/utils/common/relative-days';

export function ProfileHeroCard({
    user,
    summary,
    now,
}: {
    user: SessionUser;
    summary: ProfileSummary;
    now: number;
}) {
    const t = useTranslations('auth.profileSummary');

    const locale = useLocale();

    const { campaigns, characters, lastActivity } = summary;

    const tiles = [
        campaigns > 0 && {
            key: 'campaigns',
            value: String(campaigns),
            label: t('campaigns', { count: campaigns }),
        },
        characters > 0 && {
            key: 'characters',
            value: String(characters),
            label: t('characters', { count: characters }),
        },
        lastActivity && {
            key: 'lastActivity',
            value: formatRelativeDays(locale, lastActivity, now),
            label: t('lastActivityLabel'),
        },
    ].filter((x) => typeof x === 'object' && x !== null);

    return (
        <section className="ds-panel ornate space-y-5 p-5 sm:p-6">
            <AvatarEditor user={user} />
            {tiles.length > 0 && (
                <>
                    <div className="orn" aria-hidden />
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {tiles.map((x) => (
                            <li
                                key={x.key}
                                className="ds-inset min-w-0 rounded-lg px-3 py-2.5"
                            >
                                <p className="hud-num truncate text-2xl text-hud-ink">
                                    {x.value}
                                </p>
                                <p className="hud-sc truncate text-xs text-hud-muted">
                                    {x.label}
                                </p>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
