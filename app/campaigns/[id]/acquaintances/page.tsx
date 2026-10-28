import { redirect } from "next/navigation";

import { AcquaintancesPageClient } from "./page-client";

import { acquaintanceKeys } from "@/lib/hooks/acquaintances/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readAcquaintances } from "@/lib/server/acquaintances/store";
import { requireCampaignMember } from "@/lib/server/campaigns/access";

export default async function AcquaintancesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ focus?: string }> }) {
  const [{ id }, { focus }] = await Promise.all([params, searchParams]);

  const { campaign, isDM, userId } = await requireCampaignMember(id);

  if (!isDM && !campaign.acquaintancesEnabled) redirect(`/campaigns/${id}`);

  const data = await readAcquaintances(id, { userId, isDM });

  return (
    <PrefetchedQuery queryKey={acquaintanceKeys.list(id)} data={data}>
      <AcquaintancesPageClient campaignId={id} isDM={isDM} focusId={focus} />
    </PrefetchedQuery>
  );
}
