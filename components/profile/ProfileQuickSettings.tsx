'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/common/shell/LocaleSwitcher';
import { PaletteSwitcher } from '@/components/layout/PaletteSwitcher';
import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';

export function ProfileQuickSettings({ showOpsLink }: { showOpsLink: boolean }) {
    const t = useTranslations('auth.profileSummary');

    const tProfile = useTranslations('common.profile');

    return (
        <ProfileSectionCard title={t('quickSettings')}>
            <div className="space-y-4">
                <PaletteSwitcher />
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-hud-muted">
                        {t('language')}
                    </span>
                    <LocaleSwitcher />
                </div>
                <Link
                    href="/settings/preferences"
                    className="inline-flex min-h-10 items-center text-sm underline"
                >
                    {t('allSettings')}
                </Link>
                {showOpsLink && (
                    <div>
                        <Link
                            href="/ops"
                            className="inline-flex min-h-10 items-center text-sm underline"
                        >
                            {tProfile('opsLink')}
                        </Link>
                    </div>
                )}
            </div>
        </ProfileSectionCard>
    );
}
