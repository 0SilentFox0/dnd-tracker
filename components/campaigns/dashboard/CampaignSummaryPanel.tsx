'use client';

import { useTranslations } from 'next-intl';

import { InviteCodeDisplay } from '@/components/campaigns/settings/InviteCodeDisplay';
import { HudPill } from '@/components/hud/page';
import { CampaignStatus } from '@/lib/constants/campaigns';
import type { CampaignSettings } from '@/types/campaigns';

type CampaignSummary = CampaignSettings & { inviteCode: string | null };

export function CampaignSummaryPanel({
    campaign,
    isDM,
    memberCount,
}: {
    campaign: CampaignSummary;
    isDM: boolean;
    memberCount?: string | null;
}) {
    const t = useTranslations('dashboard.summary');

    return (
        <div
            data-tour="dashboard.summary"
            className="dashboard-summary relative z-10 flex flex-wrap items-center gap-2"
        >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <HudPill
                    tone={
                        campaign.status === CampaignStatus.ACTIVE
                            ? 'gold'
                            : 'muted'
                    }
                >
                    {t('status')} ·{' '}
                    {campaign.status === CampaignStatus.ACTIVE
                        ? t('active')
                        : t('archived')}
                </HudPill>
                <HudPill tone="bone">
                    {t('maxLevel')} · {campaign.maxLevel}
                </HudPill>
                {memberCount && <HudPill tone="muted">{memberCount}</HudPill>}
                {isDM && campaign.inviteCode && (
                    <div
                        id="invite"
                        className="border-hud-rule bg-hud-page/80 text-hud-ink flex min-w-0 max-w-full scroll-mt-20 items-center gap-1.5 rounded-full border px-2.5 py-0 text-xs sm:gap-2 sm:px-3 sm:text-sm"
                    >
                        <span className="text-hud-muted hidden shrink-0 sm:inline">
                            {t('inviteCode')}
                        </span>
                        <InviteCodeDisplay
                            inviteCode={campaign.inviteCode}
                            compact
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
