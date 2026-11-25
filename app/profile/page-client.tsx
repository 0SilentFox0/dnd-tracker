'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Button } from '@/components/ui/button';
import { useProfileActions, useSessionUser } from '@/lib/hooks/auth';
import type { ProfileSummary } from '@/lib/server/profile/summary';

const DAY_MS = 86_400_000;

type Profile = { showOpsLink: boolean; summary: ProfileSummary };

export function ProfileClient({ profile }: { profile: Profile }) {
    const t = useTranslations('common.profile');

    const tSummary = useTranslations('auth.profileSummary');

    const locale = useLocale();

    const user = useSessionUser();

    const actions = useProfileActions();

    const [now] = useState(Date.now);

    const { campaigns, characters, lastActivity } = profile.summary;

    const days = lastActivity
        ? Math.round((new Date(lastActivity).getTime() - now) / DAY_MS)
        : null;

    const counts = [
        campaigns > 0 && {
            key: 'campaigns',
            n: campaigns,
            label: tSummary('campaigns', { count: campaigns }),
        },
        characters > 0 && {
            key: 'characters',
            n: characters,
            label: tSummary('characters', { count: characters }),
        },
    ].filter((c) => c !== false);

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4">
            {!user ? (
                <LoadingState />
            ) : (
                <>
                    <OnboardingHint id="profile.avatar" />
                    <section className="ds-panel ornate p-5 sm:p-6">
                        <AvatarEditor user={user}>
                            {(counts.length > 0 || days !== null) && (
                                <>
                                    <div className="orn" aria-hidden />
                                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-hud-muted">
                                        {counts.map((c) => (
                                            <span key={c.key}>
                                                <span className="hud-num text-lg text-hud-ink">
                                                    {c.n}
                                                </span>{' '}
                                                <span className="hud-sc text-sm">
                                                    {c.label}
                                                </span>
                                            </span>
                                        ))}
                                        {days !== null && (
                                            <span className="hud-sc text-sm">
                                                {tSummary('lastActivity', {
                                                    when: new Intl.RelativeTimeFormat(
                                                        locale,
                                                        { numeric: 'auto' }
                                                    ).format(days, 'day'),
                                                })}
                                            </span>
                                        )}
                                    </p>
                                </>
                            )}
                        </AvatarEditor>
                    </section>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {profile.showOpsLink ? (
                            <Link
                                href="/ops"
                                className="inline-flex min-h-10 items-center underline"
                            >
                                {t('opsLink')}
                            </Link>
                        ) : (
                            <span />
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={actions.switchAccount}
                            >
                                {tSummary('switchAccount')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={actions.signOut}
                            >
                                {tSummary('signOut')}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
