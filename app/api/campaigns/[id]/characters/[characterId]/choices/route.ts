import { NextResponse } from "next/server";

import { saveCharacterChoices } from "./choices-handler";

import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function PUT(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId);

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(ChoicesBodySchema, request);

    if (body instanceof NextResponse) return body;

    return await saveCharacterChoices(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "save character choices" });
  }
}
