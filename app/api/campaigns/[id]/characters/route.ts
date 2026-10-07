import { NextResponse } from "next/server";

import { createCharacter } from "./create-character";
import { listCharacters } from "./list-characters";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    return await createCharacter(request, id);
  } catch (error) {
    return handleApiError(error, { action: "create character" });
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    return await listCharacters(request, id);
  } catch (error) {
    return handleApiError(error, { action: "list characters" });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const result = await prisma.character.deleteMany({ where: { campaignId: id, type: CharacterType.PLAYER } });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, { action: "delete all characters" });
  }
}
