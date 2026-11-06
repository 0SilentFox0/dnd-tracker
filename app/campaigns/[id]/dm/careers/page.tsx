import { notFound } from "next/navigation";

import { DMCareersPageClient } from "./careers-client";

import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function DMCareersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

  if (parseRules(campaign.rules).system.key !== "wfrp") notFound();

  return <DMCareersPageClient campaignId={id} canEdit={!isDemo} />;
}
