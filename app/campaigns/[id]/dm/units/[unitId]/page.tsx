import { UnitEditForm } from "@/components/units/form/UnitEditForm";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = await params;

  await requireCampaignDM(id);

  return <UnitEditForm campaignId={id} unitId={unitId} />;
}
