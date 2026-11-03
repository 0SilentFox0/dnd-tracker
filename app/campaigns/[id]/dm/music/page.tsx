import { DMMusicPageClient } from "./page-client";

import { ReadOnlyMusicPage } from "@/components/music/ReadOnlyMusicPage";
import { listTracks } from "@/lib/server/audio/track-store";
import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";

export default async function DMMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { isDemo } = await requireCampaignDMOrDemo(id);

  const tracks = await listTracks(id);

  return isDemo ? <ReadOnlyMusicPage tracks={tracks} /> : <DMMusicPageClient campaignId={id} initialTracks={tracks} />;
}
