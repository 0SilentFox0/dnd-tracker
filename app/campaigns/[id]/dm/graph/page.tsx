import { GraphPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  return <GraphPageClient campaignId={id} campaignName={campaign.name} />;
}
