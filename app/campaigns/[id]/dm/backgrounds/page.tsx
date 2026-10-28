import { DMBackgroundsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function DMBackgroundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  if (!parseRules(campaign.rules).classes.enabled) return <p className="p-4">Передісторії доступні в режимі класів 5e.</p>;

  return <DMBackgroundsPageClient campaignId={id} />;
}
