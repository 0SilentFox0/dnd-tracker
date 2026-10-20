import { UnitCreateForm } from "@/components/units/form/UnitCreateForm";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <UnitCreateForm campaignId={id} />;
}
