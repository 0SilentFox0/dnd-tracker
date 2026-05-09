import { DMCharactersClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";

export default async function DMCharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMCharactersClient campaignId={id} />;
}
