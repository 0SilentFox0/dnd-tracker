import { DMArtifactSetsPageClient } from "./page-client";

import { readArtifactSets } from "@/app/api/campaigns/[id]/artifact-sets/read-artifact-sets";
import { artifactSetKeys } from "@/lib/hooks/artifact-sets/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export default async function DMArtifactSetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const sets = await readOkJson<ArtifactSetRow[]>(await readArtifactSets({ id, accessChecked: true }));

  return (
    <PrefetchedQuery queryKey={artifactSetKeys.list(id)} data={sets}>
      <DMArtifactSetsPageClient campaignId={id} />
    </PrefetchedQuery>
  );
}
