import { SourceNotes } from "@/components/content-import/SourceNotes";
import { UnitEditForm } from "@/components/units/form/UnitEditForm";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = await params;

  await requireCampaignDM(id);

  return <><SourceNotes campaignId={id} kind="units" targetId={unitId} /><UnitEditForm campaignId={id} unitId={unitId} /></>;
}
