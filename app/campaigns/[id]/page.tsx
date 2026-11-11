import { Info } from "lucide-react";

import { CampaignSummaryPanel } from "@/components/campaigns/dashboard/CampaignSummaryPanel";
import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";
import { DmNextSteps } from "@/components/campaigns/dashboard/DmNextSteps";
import { PlayerHeroCard } from "@/components/campaigns/dashboard/PlayerHeroCard";
import { CampaignMembersList } from "@/components/campaigns/members/CampaignMembersList";
import { CreditsText } from "@/components/campaigns/templates/CreditsText";
import { PublishTemplateButton } from "@/components/campaigns/templates/PublishTemplateButton";
import { SourceSyncButton } from "@/components/campaigns/templates/SourceSyncButton";
import { HudSection } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { DemoTourMenu } from "@/components/onboarding/DemoTourMenu";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { dashboardHiddenKeys } from "@/lib/constants/campaign-dashboard";
import { CampaignKind } from "@/lib/constants/campaigns";
import { onboardingKeys } from "@/lib/hooks/onboarding/keys";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignWithMembers } from "@/lib/server/campaigns/access";
import { readDmDashboard, readPlayerDashboard } from "@/lib/server/campaigns/dashboard";
import { readCampaignOnboarding } from "@/lib/server/onboarding/campaign";
import { parseRules } from "@/lib/utils/rules/schema";


const LABEL = "text-sm text-hud-muted";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const t = await getTranslator(await getRequestLocale(), "dashboard");

  const { campaign, isDM, isDemo, authUser: user } = await requireCampaignWithMembers(id);

  const isTemplate = campaign.kind === CampaignKind.TEMPLATE;

  const isPlayer = !isDM && !isDemo;

  const hasMembership = !isTemplate && !isDemo;

  const rules = parseRules(campaign.rules);

  const classesEnabled = rules.classes.enabled;

  const [dm, player, onboarding] = await Promise.all([
    isDM && !isTemplate ? readDmDashboard(id).catch(() => null) : null,
    isPlayer ? readPlayerDashboard(id, user.id).catch(() => null) : null,
    // онбординг не має валити сторінку кампанії
    hasMembership ? readCampaignOnboarding(id, user.id, isDM).catch(() => null) : null,
  ]);

  const hiddenKeys = dashboardHiddenKeys({ isDM, isDemo, hasWorld: isDemo || !!player?.hasWorld, acquaintancesEnabled: campaign.acquaintancesEnabled });

  return (
    <HudPage>
      <HudPageHeader
        data-tour="dashboard.header"
        title={campaign.name}
        subtitle={campaign.description}
        actions={(
          <div className="flex items-center gap-2">
            {isDemo && <span className="rounded-full bg-[linear-gradient(135deg,#8a6414,var(--color-hud-gold-strong)_55%,#8a6414)] px-2 text-[11px] text-[var(--palette-primary-foreground,#2a1d05)]">{t("page.demoDmRole")}</span>}
            <span className="self-center break-all text-sm text-hud-muted">{user.email}</span>
          </div>
        )}
      />

      {isTemplate && (
        <HudPanel className="flex flex-wrap items-start gap-2 border-hud-gold/60">
          <Info className="mt-0.5 size-4 shrink-0 text-hud-gold" />
          <p className="min-w-0 flex-1 text-sm text-hud-bone">{t("page.templateNotice")}</p>
          {campaign.credits && <CreditsText credits={campaign.credits} className="basis-full" />}
          {isDM && (
            <div className="ml-auto flex flex-wrap gap-2">
              {campaign.createdFromId && <SourceSyncButton campaignId={id} isTemplate />}
              {!campaign.baseSourceId && <PublishTemplateButton campaignId={id} />}
            </div>
          )}
        </HudPanel>
      )}

      {isDemo && <HudPanel className="border-hud-gold/60" data-tour="dashboard.notice"><p className="text-sm text-hud-bone">{t("page.demoNotice")}</p></HudPanel>}

      {isDM && <HudPanel><a className="underline" href={`/campaigns/${id}/dm/compendium`}>{t("page.compendium.link")}</a><p>{t("page.compendium.text")}</p></HudPanel>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {dm && <DmNextSteps campaignId={id} data={dm} />}
          {player && <PlayerHeroCard campaignId={id} data={player} />}
          <DashboardGroups campaignId={id} isDM={isDM} isDemo={isDemo} pendingDrafts={dm?.pendingDrafts ?? 0} context={{ isTemplate, classesEnabled, systemKey: rules.system.key }} hiddenKeys={hiddenKeys} />
        </div>

        <div className="space-y-4">
          {isDemo && <DemoTourMenu />}
          <CampaignSummaryPanel campaignId={id} campaign={{ name: campaign.name, description: campaign.description, maxLevel: campaign.maxLevel, allowPlayerEdit: campaign.allowPlayerEdit, critChoiceByDm: campaign.critChoiceByDm, acquaintancesEnabled: campaign.acquaintancesEnabled, status: campaign.status, inviteCode: campaign.inviteCode }} isDM={isDM} meta={{ createdFromId: campaign.createdFromId ?? null, isTemplate, credits: campaign.credits ?? null }} />

          {hasMembership && (
            <HudPanel>
              <HudSection title={t("page.members.title")}>
                <p className={`${LABEL} mb-2`}>
                  {t("page.members.count", { count: campaign.members.length })}
                </p>
                <CampaignMembersList campaignId={id} members={campaign.members} isDM={isDM} isOwner={campaign.dmUserId === user.id} ownerId={campaign.dmUserId} />
              </HudSection>
            </HudPanel>
          )}

          {hasMembership && (
            <PrefetchedQuery queryKey={onboardingKeys.campaign(id)} data={onboarding}>
              <OnboardingChecklist campaignId={id} />
            </PrefetchedQuery>
          )}
        </div>
      </div>
    </HudPage>
  );
}
