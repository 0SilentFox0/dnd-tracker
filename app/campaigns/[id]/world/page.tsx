import { redirect } from "next/navigation";

import { WorldPageClient } from "./page-client";

import { worldKeys } from "@/lib/hooks/world/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { viewHandler } from "@/lib/server/world/view-handlers";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { WorldView } from "@/types/world";

const readView = async (campaignId: string, mapId?: string) =>
  readOkJson<WorldView>(await viewHandler(new Request(`http://localhost/world/view${mapId ? `?mapId=${encodeURIComponent(mapId)}` : ""}`), campaignId));

export default async function WorldPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ map?: string }> }) {
  const [{ id }, { map }] = await Promise.all([params, searchParams]);

  const { campaign, isDM } = await requireCampaignMember(id);

  if (isDM) redirect(`/campaigns/${id}/dm/world`);

  // a map the player may not open falls back to their current one
  const view = (map ? await readView(id, map) : null) ?? (await readView(id));

  const client = <WorldPageClient campaignId={id} campaignName={campaign.name} mapId={view?.map.id ?? null} />;

  if (!view) return client;

  return (
    <PrefetchedQuery queryKey={worldKeys.view(id, view.map.id)} data={view}>
      {client}
    </PrefetchedQuery>
  );
}
