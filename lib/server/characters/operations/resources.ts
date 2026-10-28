import { NextResponse } from "next/server";

import { guardedCharacterHandler } from "../operation-context";

import { editResourcesFor } from "@/app/api/campaigns/[id]/characters/[characterId]/resources/resources-handler";
import { resourcesEditSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

async function PATCHImpl(request: Request, { params }: CharacterRouteContext, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId, { actor, dmOnly: true });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(resourcesEditSchema, request);

    if (body instanceof NextResponse) return body;

    return await editResourcesFor(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "edit character resources" });
  }
}

export const PATCH = guardedCharacterHandler(PATCHImpl, "resources");
