import { NextResponse } from "next/server";

import { spendHitDieFor } from "./hit-die-handler";

import { hitDieSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId);

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(hitDieSchema, request);

    if (body instanceof NextResponse) return body;

    return await spendHitDieFor(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "spend hit die" });
  }
}
