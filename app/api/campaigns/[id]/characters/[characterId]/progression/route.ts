import { NextResponse } from "next/server";

import { buildProgressionDto } from "@/lib/server/characters/core/get-progression-handler";
import { loadProgressionContext } from "@/lib/server/characters/core/load-progression-context";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const ctx = await loadProgressionContext(id, characterId);

    if (ctx instanceof NextResponse) return ctx;

    return NextResponse.json(await buildProgressionDto(id, ctx));
  } catch (error) {
    return handleApiError(error, { action: "load character progression" });
  }
}
