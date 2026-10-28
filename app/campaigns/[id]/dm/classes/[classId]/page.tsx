import { redirect } from "next/navigation";

import { ClassForm } from "@/components/classes/ClassForm";
import { SourceNotes } from "@/components/content-import/SourceNotes";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toGameClassData } from "@/lib/utils/characters/classes/row";

export default async function EditClassPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id, classId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.gameClass.findFirst({ where: { id: classId, campaignId: id } });

  if (!row) redirect(`/campaigns/${id}/dm/classes`);

  return <><SourceNotes campaignId={id} kind="classes" targetId={classId} /><ClassForm campaignId={id} gameClass={toGameClassData(row)} /></>;
}
