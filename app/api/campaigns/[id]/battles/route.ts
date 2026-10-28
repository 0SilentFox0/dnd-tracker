import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { battleRecordHttp } from "@/lib/server/battles/http";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { battleSceneListSelect } from "@/lib/utils/battle/store/scene-list-select";

type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) { return battleRecordHttp(req, (await params).id, "create"); }
export async function DELETE(req: Request, { params }: Params) { return battleRecordHttp(req, (await params).id, "clear-history"); }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    if (new URL(request.url).searchParams.get("brief") === "1") {
      const briefs = await prisma.battleScene.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, status: true } });

      return NextResponse.json(briefs);
    }

    const battles = await prisma.battleScene.findMany({
      where: {
        campaignId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: battleSceneListSelect,
    });

    return NextResponse.json(
      battles.map((b) => ({
        ...b,
        initiativeOrder: [] as unknown[],
        battleLog: [] as unknown[],
      })),
    );
  } catch (error) {
    return handleApiError(error, { action: "list battles" });
  }
}
