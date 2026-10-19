import { DMMusicPageClient } from "./page-client";

import { listTracks } from "@/app/api/campaigns/[id]/tracks/track-handlers";
import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function DMMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMMusicPageClient campaignId={id} initialTracks={await listTracks(id)} />;
}
