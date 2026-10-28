import { NextResponse } from "next/server";

import { guardedCharacterHandler,operationDM } from "../operation-context";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

async function DELETEImpl(_request: Request, { params }: CampaignRouteContext, actor?: Actor) {
  try {
    const { id } = await params;

    const accessResult = await operationDM(id, actor);

    if (accessResult instanceof NextResponse) return accessResult;

    const result = await prisma.character.deleteMany({ where: { campaignId: id, type: CharacterType.PLAYER } });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, { action: "delete all characters" });
  }
}

export const DELETE = guardedCharacterHandler(DELETEImpl,"delete-all");
