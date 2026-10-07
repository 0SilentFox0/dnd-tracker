import { NextResponse } from "next/server";

import { patchCharacter } from "./patch-character";
import { readCharacter } from "./read-character";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";

type RouteContext = { params: Promise<{ id: string; characterId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    return await readCharacter(id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "fetch character" });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    return await patchCharacter(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "update character" });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const character = await loadOwned(prisma.character.findUnique({ where: { id: characterId }, select: { campaignId: true } }), id);

    if (character instanceof NextResponse) return character;

    await prisma.character.deleteMany({ where: { id: characterId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete character" });
  }
}
