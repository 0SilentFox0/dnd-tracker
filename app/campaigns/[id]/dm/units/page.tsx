import { DMUnitsPageClient } from "./page-client";

import { getCachedUnits } from "@/lib/cache/reference-data";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function DMUnitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMUnitsPageClient campaignId={id} initialUnits={await getCachedUnits(id)} />;
}
