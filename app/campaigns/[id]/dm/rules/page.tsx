import { HudFormPage } from "@/components/hud/form";
import { RulesForm } from "@/components/rules/RulesForm";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return (
    <HudFormPage title="Правила кампанії">
      <RulesForm campaignId={id} />
    </HudFormPage>
  );
}
