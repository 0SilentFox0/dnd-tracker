import { NextResponse } from "next/server";

import { setInspiration } from "./set-inspiration";

import { inspirationSchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterRow } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterRow(id, characterId, { dmOnly: true });

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(inspirationSchema, request);

    if (body instanceof NextResponse) return body;

    return await setInspiration(gate.access, gate.character, body.value);
  } catch (error) {
    return handleApiError(error, { action: "set inspiration" });
  }
}
