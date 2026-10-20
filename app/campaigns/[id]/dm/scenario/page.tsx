import { ScenarioIndexPageClient } from "./page-client";

import { listScenarioHandler } from "@/app/api/campaigns/[id]/scenario/scenario-handlers";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { ScenarioPageSummary } from "@/types/scenario";

export default async function DMScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  const pages = await readOkJson<ScenarioPageSummary[]>(await listScenarioHandler(id));

  return (
    <PrefetchedQuery queryKey={scenarioKeys.list(id)} data={pages}>
      <ScenarioIndexPageClient campaignId={id} campaignName={campaign.name} />
    </PrefetchedQuery>
  );
}
