'use client';

import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { AvatarEditor } from '@/components/profile/AvatarEditor';
import { useSessionUser } from '@/lib/hooks/auth';

export function ProfileClient() {
    const t = useTranslations('common.profile');

    const user = useSessionUser();

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
                </div>
            )}
        </HudPage>
    );
}
