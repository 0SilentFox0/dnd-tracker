import { GraphPageClient } from "./page-client";

import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";

export default async function DMGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

  return <GraphPageClient campaignId={id} campaignName={campaign.name} canEdit={!isDemo} />;
}
