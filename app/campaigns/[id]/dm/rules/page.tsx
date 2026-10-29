import { HudFormPage } from "@/components/hud/form";
import { RulesForm } from "@/components/rules/RulesForm";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const t = await getTranslator(await getRequestLocale(), "rules");

  return (
    <HudFormPage title={t("page.title")}>
      <RulesForm campaignId={id} />
    </HudFormPage>
  );
}
