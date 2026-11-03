import { SkillTreePageClient } from "./page-client";

import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";

export default async function SkillTreesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { isDemo } = await requireCampaignDMOrDemo(id);

  return <SkillTreePageClient campaignId={id} canEdit={!isDemo} />;
}
