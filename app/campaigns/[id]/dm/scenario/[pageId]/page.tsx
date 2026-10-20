import { notFound } from "next/navigation";

import { ScenarioPageClient } from "./page-client";

import { ErrorState } from "@/components/common/states";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { getPage, InvalidScenarioContentError, loadPlayedSections } from "@/lib/server/scenario/page-store";
import { revealTargets } from "@/lib/utils/scenario/reveal";

export default async function DMScenarioPageRoute({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;

  await requireCampaignDM(id);

  const page = await getPage(id, pageId).catch((error: unknown) => {
    if (error instanceof InvalidScenarioContentError) return error;

    throw error;
  });

  if (!page) notFound();

  if (page instanceof InvalidScenarioContentError) return <ErrorState error={page} />;

  const playedPages = await loadPlayedSections(id, [...new Set(revealTargets(page.content.sections).map((t) => t.pageId))]);

  return <ScenarioPageClient campaignId={id} initialPage={page} playedPages={playedPages} />;
}
