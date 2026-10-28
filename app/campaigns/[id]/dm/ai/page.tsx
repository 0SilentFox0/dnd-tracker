import { DmAiPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DmAiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DmAiPageClient campaignId={id} />;
}
