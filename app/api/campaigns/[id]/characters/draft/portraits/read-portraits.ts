import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

const PORTRAITS_LIMIT = 50;

export async function readDraftPortraits(campaignId: string, race: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  if (!race) return NextResponse.json({ portraits: [] });

  const units = await prisma.unit.findMany({
    where: { avatar: { not: "" }, race: { campaignId, name: race } },
    select: { avatar: true },
    orderBy: { id: "asc" },
    take: PORTRAITS_LIMIT,
  });

  return NextResponse.json({ portraits: units.flatMap((u) => (u.avatar ? [u.avatar] : [])) });
}
