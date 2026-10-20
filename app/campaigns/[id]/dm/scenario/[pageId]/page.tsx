import { notFound } from "next/navigation";

import { ScenarioPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { getPage } from "@/lib/server/scenario/page-store";

export default async function DMScenarioPageRoute({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;

  await requireCampaignDM(id);

  const page = await getPage(id, pageId);

  if (!page) notFound();

  return <ScenarioPageClient campaignId={id} initialPage={page} />;
}
