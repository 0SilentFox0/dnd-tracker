import { NextResponse } from "next/server";
import { z } from "zod";

import { runProgressionAction } from "../progression-action-handler";

import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

const bodySchema = z.object({ nodeIds: z.array(z.string().min(1)).min(1).max(100) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const parsed = await parseBody(bodySchema, request, "Невалідний запит");

    if (parsed instanceof NextResponse) return parsed;

    return await runProgressionAction(id, characterId, { type: "unlearn", nodeIds: parsed.nodeIds });
  } catch (error) {
    return handleApiError(error, { action: "unlearn skill node" });
  }
}
