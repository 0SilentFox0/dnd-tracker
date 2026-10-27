import { CampaignSettingsButton } from "@/components/campaigns/settings/CampaignSettingsButton";
import { InviteCodeDisplay } from "@/components/campaigns/settings/InviteCodeDisplay";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { CampaignStatus } from "@/lib/constants/campaigns";

const LABEL = "text-sm text-hud-muted";

interface CampaignSummary {
  name: string;
  description: string | null;
  maxLevel: number;
  allowPlayerEdit: boolean;
  status: string;
  inviteCode: string;
}

export function CampaignSummaryPanel({ campaignId, campaign, isDM }: { campaignId: string; campaign: CampaignSummary; isDM: boolean }) {
  return (
    <HudPanel>
      <HudSection
        title="Кампанія"
        action={
          isDM ? (
            <CampaignSettingsButton
              campaignId={campaignId}
              campaign={{
                name: campaign.name,
                description: campaign.description || null,
                maxLevel: campaign.maxLevel,
                allowPlayerEdit: campaign.allowPlayerEdit,
                status: campaign.status as CampaignStatus,
              }}
            />
          ) : undefined
        }
      >
        <div className="space-y-3">
          <div>
            <p className={LABEL}>Макс. рівень</p>
            <p className="text-lg font-semibold text-hud-ink">{campaign.maxLevel}</p>
          </div>
          <div id="invite" className="scroll-mt-20">
            <p className={`${LABEL} mb-2`}>Код запрошення</p>
            <InviteCodeDisplay inviteCode={campaign.inviteCode} />
          </div>
          <div>
            <p className={LABEL}>Статус</p>
            <span className="inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
              {campaign.status === CampaignStatus.ACTIVE ? "Активна" : "Архівована"}
            </span>
          </div>
        </div>
      </HudSection>
    </HudPanel>
  );
}
