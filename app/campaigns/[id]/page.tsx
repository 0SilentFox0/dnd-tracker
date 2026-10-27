import { CampaignSummaryPanel } from "@/components/campaigns/dashboard/CampaignSummaryPanel";
import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";
import { DmNextSteps } from "@/components/campaigns/dashboard/DmNextSteps";
import { PlayerHeroCard } from "@/components/campaigns/dashboard/PlayerHeroCard";
import { CampaignMembersList } from "@/components/campaigns/members/CampaignMembersList";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { onboardingKeys } from "@/lib/hooks/onboarding/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignWithMembers } from "@/lib/server/campaigns/access";
import { readDmDashboard, readPlayerDashboard } from "@/lib/server/campaigns/dashboard";
import { readCampaignOnboarding } from "@/lib/server/onboarding/campaign";
import { pluralUk } from "@/lib/utils/common/plural";

const LABEL = "text-sm text-hud-muted";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign, isDM, authUser: user } = await requireCampaignWithMembers(id);

  const [dm, player, onboarding] = await Promise.all([
    isDM ? readDmDashboard(id).catch(() => null) : null,
    !isDM ? readPlayerDashboard(id, user.id).catch(() => null) : null,
    // онбординг не має валити сторінку кампанії
    readCampaignOnboarding(id, user.id, isDM).catch(() => null),
  ]);

  return (
    <HudPage>
      <HudPageHeader
        title={campaign.name}
        subtitle={campaign.description}
        actions={<span className="self-center break-all text-sm text-hud-muted">{user.email}</span>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {dm && <DmNextSteps campaignId={id} data={dm} />}
          {player && <PlayerHeroCard campaignId={id} data={player} />}
          <DashboardGroups campaignId={id} isDM={isDM} pendingDrafts={dm?.pendingDrafts ?? 0} />
        </div>

        <div className="space-y-4">
          <CampaignSummaryPanel campaignId={id} campaign={campaign} isDM={isDM} />

          <HudPanel>
            <HudSection title="Учасники">
              <p className={`${LABEL} mb-2`}>
                {campaign.members.length} {pluralUk(campaign.members.length, ["учасник", "учасники", "учасників"])} в кампанії
              </p>
              <CampaignMembersList campaignId={id} members={campaign.members} isDM={isDM} />
            </HudSection>
          </HudPanel>

          <PrefetchedQuery queryKey={onboardingKeys.campaign(id)} data={onboarding}>
            <OnboardingChecklist campaignId={id} />
          </PrefetchedQuery>
        </div>
      </div>
    </HudPage>
  );
}
