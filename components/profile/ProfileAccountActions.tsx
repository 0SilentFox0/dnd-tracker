'use client';

import { useTranslations } from 'next-intl';

import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { Button } from '@/components/ui/button';
import { useProfileActions } from '@/lib/hooks/auth';

export function ProfileAccountActions() {
    const t = useTranslations('auth.profileSummary');

    const actions = useProfileActions();

    return (
        <ProfileSectionCard title={t('accountActions')}>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={actions.switchAccount}
                >
                    {t('switchAccount')}
                </Button>
                <Button type="button" variant="ghost" onClick={actions.signOut}>
                    {t('signOut')}
                </Button>
            </div>
        </ProfileSectionCard>
    );
}
