import { DMShowPageClient } from "./page-client";

import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";
import { listDecks } from "@/lib/server/show/deck-store";

export default async function DMShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { isDemo } = await requireCampaignDMOrDemo(id);

  return <DMShowPageClient campaignId={id} initialDecks={await listDecks(id)} canEdit={!isDemo} />;
}
