import { NextResponse } from "next/server";

import { editResourcesFor } from "./resources-handler";

import { resourcesEditSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function PATCH(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId, { dmOnly: true });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(resourcesEditSchema, request);

    if (body instanceof NextResponse) return body;

    return await editResourcesFor(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "edit character resources" });
  }
}
