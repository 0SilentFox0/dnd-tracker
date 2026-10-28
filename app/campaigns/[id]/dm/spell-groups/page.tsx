import { HudPage, HudPageHeader } from "@/components/hud/page";
import { SpellGroupList } from "@/components/spells/groups/SpellGroupList";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMSpellGroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return (
    <HudPage>
      <HudPageHeader title="Школи магії" subtitle="Колір та іконка школи — у книзі заклинань і на дереві прокачки" />
      <SpellGroupList campaignId={id} />
    </HudPage>
  );
}
