import { CompendiumImport } from "@/components/content-import/CompendiumImport";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
export default async function CompendiumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <CompendiumImport campaignId={id} />;
}
