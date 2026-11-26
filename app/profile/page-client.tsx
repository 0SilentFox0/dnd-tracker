'use client';

import { LoadingState } from '@/components/common/states';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';
import { ProfileAccountActions } from '@/components/profile/ProfileAccountActions';
import { ProfileCampaigns } from '@/components/profile/ProfileCampaigns';
import { ProfileHeroCard } from '@/components/profile/ProfileHeroCard';
import { ProfileHeroes } from '@/components/profile/ProfileHeroes';
import { ProfileQuickSettings } from '@/components/profile/ProfileQuickSettings';
import { useSessionUser } from '@/lib/hooks/auth';
import type { ProfileSummary } from '@/types/profile';

type Profile = { showOpsLink: boolean; summary: ProfileSummary; now: number };

export function ProfileClient({ profile }: { profile: Profile }) {
    const user = useSessionUser();

    const { summary, now } = profile;

    if (!user) return <LoadingState />;

    return (
        <div className="space-y-4">
            <OnboardingHint id="profile.avatar" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                <div className="min-w-0 space-y-4">
                    <ProfileHeroCard user={user} summary={summary} now={now} />
                    <ProfileCampaigns
                        campaigns={summary.recentCampaigns}
                        now={now}
                    />
                    <ProfileHeroes heroes={summary.recentCharacters} />
                </div>
                <div className="min-w-0 space-y-4">
                    <ProfileQuickSettings showOpsLink={profile.showOpsLink} />
                    <ProfileAccountActions />
                    {user.email ? (
                        <DeleteAccountSection email={user.email} />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
