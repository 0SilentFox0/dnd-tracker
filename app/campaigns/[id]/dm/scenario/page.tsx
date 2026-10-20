import { ScenarioIndexPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { listPages } from "@/lib/server/scenario/page-store";

export default async function DMScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  return <ScenarioIndexPageClient campaignId={id} campaignName={campaign.name} initialPages={await listPages(id)} />;
}
