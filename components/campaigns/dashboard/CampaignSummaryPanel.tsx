"use client";

import { useTranslations } from "next-intl";

import { CampaignSettingsButton } from "@/components/campaigns/settings/CampaignSettingsButton";
import { InviteCodeDisplay } from "@/components/campaigns/settings/InviteCodeDisplay";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { CampaignStatus } from "@/lib/constants/campaigns";
import type { CampaignSettings, CampaignSettingsMeta } from "@/types/campaigns";

const LABEL = "text-sm text-hud-muted";

type CampaignSummary = CampaignSettings & { inviteCode: string };

export function CampaignSummaryPanel({ campaignId, campaign, isDM, meta }: { campaignId: string; campaign: CampaignSummary; isDM: boolean; meta: CampaignSettingsMeta }) {
  const t = useTranslations("dashboard.summary");

  return (
    <HudPanel>
      <HudSection
        title={t("title")}
        action={
          isDM ? (
            <CampaignSettingsButton
              campaignId={campaignId}
              campaign={{
                name: campaign.name,
                description: campaign.description || null,
                maxLevel: campaign.maxLevel,
                allowPlayerEdit: campaign.allowPlayerEdit,
                critChoiceByDm: campaign.critChoiceByDm,
                acquaintancesEnabled: campaign.acquaintancesEnabled,
                status: campaign.status,
              }}
              meta={meta}
            />
          ) : undefined
        }
      >
        <div className="space-y-3">
          <div>
            <p className={LABEL}>{t("maxLevel")}</p>
            <p className="text-lg font-semibold text-hud-ink">{campaign.maxLevel}</p>
          </div>
          {!meta.isTemplate && (
            <div id="invite" className="scroll-mt-20">
              <p className={`${LABEL} mb-2`}>{t("inviteCode")}</p>
              <InviteCodeDisplay inviteCode={campaign.inviteCode} />
            </div>
          )}
          <div>
            <p className={LABEL}>{t("status")}</p>
            <span className="inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
              {campaign.status === CampaignStatus.ACTIVE ? t("active") : t("archived")}
            </span>
          </div>
        </div>
      </HudSection>
    </HudPanel>
  );
}
