import { DMMusicPageClient } from "./page-client";

import { listTracks } from "@/lib/server/audio/track-store";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMMusicPageClient campaignId={id} initialTracks={await listTracks(id)} />;
}
