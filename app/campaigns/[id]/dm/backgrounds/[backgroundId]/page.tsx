import { redirect } from "next/navigation";

import { BackgroundForm } from "@/components/backgrounds/BackgroundForm";
import { SourceNotes } from "@/components/content-import/SourceNotes";
import { prisma } from "@/lib/db";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toBackgroundData } from "@/lib/utils/backgrounds/row";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function EditBackgroundPage({ params }: { params: Promise<{ id: string; backgroundId: string }> }) {
  const { id, backgroundId } = await params;

  const { campaign } = await requireCampaignDM(id);

  if (!parseRules(campaign.rules).classes.enabled) return <p className="p-4">{(await getTranslator(await getRequestLocale(), "backgrounds"))("page.classesOnly")}</p>;

  const row = await prisma.background.findFirst({ where: { id: backgroundId, campaignId: id } });

  if (!row) redirect(`/campaigns/${id}/dm/backgrounds`);

  return <><SourceNotes campaignId={id} kind="backgrounds" targetId={backgroundId} /><BackgroundForm campaignId={id} background={toBackgroundData(row)} /></>;
}
