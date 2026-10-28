import { DMBackgroundsPageClient } from "./page-client";

import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function DMBackgroundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign } = await requireCampaignDM(id);

  if (!parseRules(campaign.rules).classes.enabled) return <p className="p-4">{(await getTranslator(await getRequestLocale(), "backgrounds"))("page.classesOnly")}</p>;

  return <DMBackgroundsPageClient campaignId={id} />;
}
