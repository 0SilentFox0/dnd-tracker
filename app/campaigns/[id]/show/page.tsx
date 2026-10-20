import { ShowPageClient } from "./page-client";

import { readShow } from "@/app/api/campaigns/[id]/show/show-handler";
import { showKeys } from "@/lib/hooks/show/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { ShowResponse, ShowSnapshot } from "@/types/show";

export default async function ShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ isDM }, body] = await Promise.all([requireCampaignMember(id), readShow(id).then((res) => readOkJson<ShowResponse>(res))]);

  const seed: ShowSnapshot | null = body && { show: body.show, clockOffsetMs: null };

  return (
    <PrefetchedQuery queryKey={showKeys.state(id)} data={seed}>
      <ShowPageClient campaignId={id} isDM={isDM} />
    </PrefetchedQuery>
  );
}
