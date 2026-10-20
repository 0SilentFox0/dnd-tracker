import { SkillTreePageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function SkillTreesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <SkillTreePageClient campaignId={id} />;
}
