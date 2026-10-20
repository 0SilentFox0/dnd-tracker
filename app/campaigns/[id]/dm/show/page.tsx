import { DMShowPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { listDecks } from "@/lib/server/show/deck-store";

export default async function DMShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMShowPageClient campaignId={id} initialDecks={await listDecks(id)} />;
}
