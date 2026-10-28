import { Info } from "lucide-react";

import { CampaignSummaryPanel } from "@/components/campaigns/dashboard/CampaignSummaryPanel";
import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";
import { DmNextSteps } from "@/components/campaigns/dashboard/DmNextSteps";
import { PlayerHeroCard } from "@/components/campaigns/dashboard/PlayerHeroCard";
import { CampaignMembersList } from "@/components/campaigns/members/CampaignMembersList";
import { CreditsText } from "@/components/campaigns/templates/CreditsText";
import { SourceSyncButton } from "@/components/campaigns/templates/SourceSyncButton";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { CampaignKind } from "@/lib/constants/campaigns";
import { onboardingKeys } from "@/lib/hooks/onboarding/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignWithMembers } from "@/lib/server/campaigns/access";
import { readDmDashboard, readPlayerDashboard } from "@/lib/server/campaigns/dashboard";
import { readCampaignOnboarding } from "@/lib/server/onboarding/campaign";
import { pluralUk } from "@/lib/utils/common/plural";
import { parseRules } from "@/lib/utils/rules/schema";

const HIDDEN_WITHOUT_WORLD = ["player-world"];

const LABEL = "text-sm text-hud-muted";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { campaign, isDM, authUser: user } = await requireCampaignWithMembers(id);

  const isTemplate = campaign.kind === CampaignKind.TEMPLATE;

  const classesEnabled = parseRules(campaign.rules).classes.enabled;

  const [dm, player, onboarding] = await Promise.all([
    isDM && !isTemplate ? readDmDashboard(id).catch(() => null) : null,
    !isDM ? readPlayerDashboard(id, user.id).catch(() => null) : null,
    // онбординг не має валити сторінку кампанії
    isTemplate ? null : readCampaignOnboarding(id, user.id, isDM).catch(() => null),
  ]);

  return (
    <HudPage>
      <HudPageHeader
        title={campaign.name}
        subtitle={campaign.description}
        actions={<span className="self-center break-all text-sm text-hud-muted">{user.email}</span>}
      />

      {isTemplate && (
        <HudPanel className="flex flex-wrap items-start gap-2 border-hud-gold/60">
          <Info className="mt-0.5 size-4 shrink-0 text-hud-gold" />
          <p className="min-w-0 flex-1 text-sm text-hud-bone">Це шаблон: зміни потрапляють у нові кампанії, створені з нього; наявні кампанії не змінюються.</p>
          {campaign.credits && <CreditsText credits={campaign.credits} className="basis-full" />}
          {isDM && campaign.createdFromId && (
            <div className="ml-auto">
              <SourceSyncButton campaignId={id} isTemplate />
            </div>
          )}
        </HudPanel>
      )}

      {isDM && <HudPanel><a className="underline" href={`/campaigns/${id}/dm/compendium`}>Імпорт JSON-компендіуму та збережені звіти</a><p>Наповніть кампанію одним JSON: бібліотеки, матеріали ДМ і наступні дії.</p></HudPanel>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {dm && <DmNextSteps campaignId={id} data={dm} />}
          {player && <PlayerHeroCard campaignId={id} data={player} />}
          <DashboardGroups campaignId={id} isDM={isDM} pendingDrafts={dm?.pendingDrafts ?? 0} context={{ isTemplate, classesEnabled }} hiddenKeys={player?.hasWorld ? undefined : HIDDEN_WITHOUT_WORLD} />
        </div>

        <div className="space-y-4">
          <CampaignSummaryPanel campaignId={id} campaign={campaign} isDM={isDM} meta={{ createdFromId: campaign.createdFromId ?? null, isTemplate, credits: campaign.credits ?? null }} />

          {!isTemplate && (
            <HudPanel>
              <HudSection title="Учасники">
                <p className={`${LABEL} mb-2`}>
                  {campaign.members.length} {pluralUk(campaign.members.length, ["учасник", "учасники", "учасників"])} в кампанії
                </p>
                <CampaignMembersList campaignId={id} members={campaign.members} isDM={isDM} />
              </HudSection>
            </HudPanel>
          )}

          {!isTemplate && (
            <PrefetchedQuery queryKey={onboardingKeys.campaign(id)} data={onboarding}>
              <OnboardingChecklist campaignId={id} />
            </PrefetchedQuery>
          )}
        </div>
      </div>
    </HudPage>
  );
}
