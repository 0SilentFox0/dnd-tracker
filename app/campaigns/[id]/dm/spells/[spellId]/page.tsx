import { SpellEditForm } from "@/components/spells/form/SpellEditForm";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function EditSpellPage({ params }: { params: Promise<{ id: string; spellId: string }> }) {
  const { id, spellId } = await params;

  await requireCampaignDM(id);

  return <SpellEditForm campaignId={id} spellId={spellId} />;
}
