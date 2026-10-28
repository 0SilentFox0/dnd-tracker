import { NextResponse } from "next/server";

import { guardedCharacterHandler } from "../operation-context";

import { setInspiration } from "@/app/api/campaigns/[id]/characters/[characterId]/inspiration/set-inspiration";
import { inspirationSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterRow } from "@/lib/server/characters/access";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

async function POSTImpl(request: Request, { params }: CharacterRouteContext, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterRow(id, characterId, { actor, dmOnly: true });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(inspirationSchema, request);

    if (body instanceof NextResponse) return body;

    return await setInspiration(gate.access, gate.character, body.value);
  } catch (error) {
    return handleApiError(error, { action: "set inspiration" });
  }
}

export const POST = guardedCharacterHandler(POSTImpl, "inspiration");
