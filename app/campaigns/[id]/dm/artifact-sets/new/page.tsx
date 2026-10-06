import { ArtifactSetForm } from "@/components/artifact-sets/ArtifactSetForm";
import { HudFormPage } from "@/components/hud/form";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function NewArtifactSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  return (
    <HudFormPage title="Новий сет артефактів" aside="Задайте бонус повного комплекту та оберіть артефакти-члени сету.">
      <ArtifactSetForm campaignId={id} />
    </HudFormPage>
  );
}
