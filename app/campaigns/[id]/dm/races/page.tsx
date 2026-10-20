import { DMRacesPageClient } from "./page-client";

import { readRaces } from "@/app/api/campaigns/[id]/races/read-races";
import { raceKeys } from "@/lib/hooks/races/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { Race } from "@/types/races";

export default async function DMRacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const races = await readOkJson<Race[]>(await readRaces({ id, accessChecked: true }));

  return (
    <PrefetchedQuery queryKey={raceKeys.list(id)} data={races}>
      <DMRacesPageClient campaignId={id} />
    </PrefetchedQuery>
  );
}
