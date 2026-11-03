import { DMClassesPageClient } from "./page-client";

import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";

export default async function DMClassesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { isDemo } = await requireCampaignDMOrDemo(id);

  return <DMClassesPageClient campaignId={id} canEdit={!isDemo} />;
}
