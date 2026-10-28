import { NextResponse } from "next/server";

import { guardedCharacterHandler,operationDM } from "../operation-context";

import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import type { CharacterRouteContext } from "@/types/api";

async function DELETEImpl(_request: Request, { params }: CharacterRouteContext, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const accessResult = await operationDM(id, actor);

    if (accessResult instanceof NextResponse) return accessResult;

    const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true } }), id);

    if (character instanceof NextResponse) return character;

    await prisma.character.deleteMany({ where: { id: characterId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete character" });
  }
}

export const DELETE = guardedCharacterHandler(DELETEImpl,"delete");
