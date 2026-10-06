import { NextResponse } from "next/server";
import { z } from "zod";

import { BATTLE_VERSION_ONLY_PARAM } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { createBattleSchema } from "@/lib/schemas";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { readBattleScene, readBattleVersion } from "@/lib/utils/battle/pipeline/read-battle";

type Params = { params: Promise<{ id: string; battleId: string }> };

const patchBattleSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    participants: createBattleSchema.shape.participants.optional(),
  })
  .strict();

export async function GET(req: Request, { params }: Params) {
  if (new URL(req.url).searchParams.has(BATTLE_VERSION_ONLY_PARAM)) return readBattleVersion(await params);

  return readBattleScene(await params);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const parsed = patchBattleSchema.safeParse(await request.json().catch(() => undefined));

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
    }

    const battle = await prisma.battleScene.findUnique({ where: { id: battleId }, select: { campaignId: true } });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.battleScene.update({ where: { id: battleId }, data: { ...parsed.data, version: { increment: 1 } } });

    return readBattleScene({ id, battleId });
  } catch (error) {
    return handleApiError(error, { action: "update battle" });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const battle = await prisma.battleScene.findUnique({
      where: { id: battleId },
      select: { campaignId: true },
    });

    if (!battle || battle.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.battleScene.deleteMany({
      where: { id: battleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete battle" });
  }
}
