import { redirect } from "next/navigation";

import { SourceNotes } from "@/components/content-import/SourceNotes";
import { FeatForm } from "@/components/feats/FeatForm";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toFeatData } from "@/lib/utils/feats/row";

export default async function EditFeatPage({ params }: { params: Promise<{ id: string; featId: string }> }) {
  const { id, featId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.feat.findFirst({ where: { id: featId, campaignId: id } });

  if (!row) redirect(`/campaigns/${id}/dm/feats`);

  return <><SourceNotes campaignId={id} kind="feats" targetId={featId} /><FeatForm campaignId={id} feat={toFeatData(row)} /></>;
}
