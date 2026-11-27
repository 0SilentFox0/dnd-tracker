'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Swords } from 'lucide-react';

import { HudPill } from '@/components/hud/page';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { CampaignRole } from '@/lib/constants/campaigns';
import { formatRelativeDays } from '@/lib/utils/common/relative-days';
import type { ProfileCampaign } from '@/types/profile';

export function ProfileCampaigns({
    campaigns,
    now,
}: {
    campaigns: ProfileCampaign[];
    now: number;
}) {
    const t = useTranslations('auth.profileSummary');

    const locale = useLocale();

    return (
        <ProfileSectionCard title={t('campaignsTitle')}>
            {campaigns.length === 0 ? (
                <ProfileEmptyState
                    icon={Swords}
                    text={t('campaignsEmpty')}
                    href="/campaigns"
                    cta={t('campaignsEmptyLink')}
                />
            ) : (
                <ul className="space-y-1">
                    {campaigns.map((c) => (
                        <li key={c.id}>
                            <Link
                                href={`/campaigns/${c.id}`}
                                className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-hud-panel-2"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-hud-ink">
                                        {c.name}
                                    </span>
                                    <span className="block text-xs text-hud-muted">
                                        {formatRelativeDays(
                                            locale,
                                            c.updatedAt,
                                            now
                                        )}
                                    </span>
                                </span>
                                <HudPill tone="role">
                                    {c.role === CampaignRole.DM
                                        ? t('roleDm')
                                        : t('rolePlayer')}
                                </HudPill>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </ProfileSectionCard>
    );
}
