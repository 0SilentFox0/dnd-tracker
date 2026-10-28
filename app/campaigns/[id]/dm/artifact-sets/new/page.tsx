import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { HudFormPage } from "@/components/hud/form";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function NewArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  const t = await getTranslator(await getRequestLocale(), "artifacts");

  return (
    <HudFormPage title={t("sets.new.title")} aside={t("sets.new.aside")}>
      <ArtifactSetForm campaignId={id} />
    </HudFormPage>
  );
}
