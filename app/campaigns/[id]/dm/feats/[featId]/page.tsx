import { redirect } from "next/navigation";

import { FeatForm } from "@/components/feats/FeatForm";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toFeatData } from "@/lib/utils/feats/row";

export default async function EditFeatPage({ params }: { params: Promise<{ id: string; featId: string }> }) {
  const { id, featId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.feat.findFirst({ where: { id: featId, campaignId: id } });

  if (!row) redirect(`/campaigns/${id}/dm/feats`);

  return <FeatForm campaignId={id} feat={toFeatData(row)} />;
}
