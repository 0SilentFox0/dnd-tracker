'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { PROFILE_MENU } from '@/components/layout/profile-menu';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { Button } from '@/components/ui/button';
import { useProfileActions, useSessionUser } from '@/lib/hooks/auth';

const ROW =
    'flex w-full items-center justify-start gap-3 rounded-md px-3 py-2 text-left text-sm font-normal text-hud-text hover:bg-hud-gold/10';

export function ProfileClient() {
    const t = useTranslations('common.profile');

    const tHeader = useTranslations('common.header');

    const user = useSessionUser();

    const actions = useProfileActions();

    return (
        <HudPage width="md">
            <HudPageHeader title={t('title')} subtitle={t('subtitle')} />
            {!user ? (
                <LoadingState />
            ) : (
                <div className="space-y-4">
                    <OnboardingHint id="profile.avatar" />
                    <HudPanel>
                        <AvatarEditor user={user} />
                    </HudPanel>
                    <HudPanel>
                        <h2 className="mb-2 text-sm font-semibold text-hud-muted">
                            {t('sections.account')}
                        </h2>
                        <ul className="space-y-1">
                            {PROFILE_MENU.map((entry) => (
                                <li key={entry.id}>
                                    {'href' in entry ? (
                                        <Link href={entry.href} className={ROW}>
                                            <entry.icon className="size-4" />
                                            {tHeader(entry.labelKey)}
                                        </Link>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className={ROW}
                                            onClick={() =>
                                                actions[entry.action]()
                                            }
                                        >
                                            <entry.icon className="size-4" />
                                            {tHeader(entry.labelKey)}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </HudPanel>
                </div>
            )}
        </HudPage>
    );
}
