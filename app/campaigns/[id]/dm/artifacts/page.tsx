import { DMArtifactsPageClient } from "./page-client";

import { artifactSetKeys } from "@/lib/hooks/artifact-sets/keys";
import { artifactKeys } from "@/lib/hooks/artifacts/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readArtifactSets } from "@/lib/server/artifacts/read-artifact-sets";
import { readArtifacts } from "@/lib/server/artifacts/read-artifacts";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { ArtifactListItem } from "@/types/artifacts";

export default async function DMArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const [artifacts, sets] = await Promise.all([
    readArtifacts({ id, accessChecked: true }).then((res) => readOkJson<ArtifactListItem[]>(res)),
    readArtifactSets({ id, accessChecked: true }).then((res) => readOkJson<ArtifactSetRow[]>(res)),
  ]);

  return (
    <PrefetchedQuery queryKey={artifactKeys.list(id)} data={artifacts}>
      <PrefetchedQuery queryKey={artifactSetKeys.list(id)} data={sets}>
        <DMArtifactsPageClient campaignId={id} />
      </PrefetchedQuery>
    </PrefetchedQuery>
  );
}
