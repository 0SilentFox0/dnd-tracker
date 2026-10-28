import { NextResponse } from "next/server";

import { guardedCharacterHandler } from "../operation-context";

import { rollForSheet } from "@/app/api/campaigns/[id]/characters/[characterId]/roll/roll-handler";
import { sheetRollSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

async function POSTImpl(request: Request, { params }: CharacterRouteContext, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId, { actor });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(sheetRollSchema, request);

    if (body instanceof NextResponse) return body;

    return await rollForSheet(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "roll from sheet" });
  }
}

export const POST = guardedCharacterHandler(POSTImpl, "roll");
