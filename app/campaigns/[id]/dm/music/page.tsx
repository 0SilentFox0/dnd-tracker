import { DMMusicPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { listTracks } from "@/lib/utils/audio/track-store";

export default async function DMMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMMusicPageClient campaignId={id} initialTracks={await listTracks(id)} />;
}
