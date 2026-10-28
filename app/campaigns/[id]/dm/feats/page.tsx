import { DMFeatsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMFeatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMFeatsPageClient campaignId={id} />;
}
