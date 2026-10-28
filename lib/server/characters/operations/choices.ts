import { NextResponse } from "next/server";

import { guardedCharacterHandler } from "../operation-context";

import { saveCharacterChoices } from "@/app/api/campaigns/[id]/characters/[characterId]/choices/choices-handler";
import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

async function PUTImpl(request: Request, { params }: CharacterRouteContext, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId, { actor });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(ChoicesBodySchema, request);

    if (body instanceof NextResponse) return body;

    return await saveCharacterChoices(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "save character choices" });
  }
}

export const PUT = guardedCharacterHandler(PUTImpl, "choices");
