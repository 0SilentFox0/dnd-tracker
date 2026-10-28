import { NextResponse } from "next/server";

import { buildProgressionDto } from "./get-progression-handler";
import { loadProgressionContext } from "./load-progression-context";

import type { Actor } from "@/lib/utils/api/actor";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }, actor?: Actor) {
  try {
    const { id, characterId } = await params;

    const ctx = await loadProgressionContext(id, characterId, actor);

    if (ctx instanceof NextResponse) return ctx;

    return NextResponse.json(await buildProgressionDto(id, ctx));
  } catch (error) {
    return handleApiError(error, { action: "load character progression" });
  }
}
