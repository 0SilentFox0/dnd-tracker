import { DmAiPageClient } from "./page-client";

import { CampaignKind } from "@/lib/constants/campaigns";
import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DmAiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  return <DmAiPageClient campaignId={id} isTemplate={campaign.kind === CampaignKind.TEMPLATE} />;
}
