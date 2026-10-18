import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_VERSION_ONLY_PARAM } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { battleMapSchema, createBattleSchema } from "@/lib/schemas";
import { resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { readBattleScene, readBattleVersion } from "@/lib/utils/battle/pipeline/read-battle";

type Params = { params: Promise<{ id: string; battleId: string }> };

const patchBattleSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    participants: createBattleSchema.shape.participants.optional(),
    map: battleMapSchema.nullable().optional(),
  })
  .strict();

function storedBackground(map: Prisma.JsonValue): string | null {
  const bg = map && typeof map === "object" && !Array.isArray(map) ? map.background : null;

  return typeof bg === "string" ? bg : null;
}

export async function GET(req: Request, { params }: Params) {
  if (new URL(req.url).searchParams.has(BATTLE_VERSION_ONLY_PARAM)) return readBattleVersion(await params);

  return readBattleScene(await params);
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, battleId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const parsed = await parseBody(patchBattleSchema, request);

    if (parsed instanceof NextResponse) return parsed;

    const battle = await prisma.battleScene.findUnique({ where: { id: battleId }, select: { campaignId: true, map: true } });

    if (!battle || battle.campaignId !== id) {
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    const { map: rawMap, ...rest } = parsed;

    let map = rawMap;

    if (map) {
      const bg = await resolveMapBackgroundForPersistence(map.background, { campaignId: id, current: storedBackground(battle.map) });

      if (!bg.ok) return errorResponse(bg.message, 400);

      map = { ...map, background: bg.background ?? null };
    }

    await prisma.battleScene.update({
      where: { id: battleId },
      data: { ...rest, ...(map !== undefined && { map: map ?? Prisma.DbNull }), version: { increment: 1 } },
    });

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
      return errorResponse(API_ERRORS.NOT_FOUND, 404);
    }

    await prisma.battleScene.deleteMany({
      where: { id: battleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete battle" });
  }
}
