import { SpellCreateForm } from "@/components/spells/form/SpellCreateForm";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function NewSpellPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <SpellCreateForm campaignId={id} />;
}
