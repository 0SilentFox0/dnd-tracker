import { NextResponse } from "next/server";
import { z } from "zod";

import { runProgressionAction } from "../progression-action-handler";

import { handleApiError } from "@/lib/utils/api/error-handler";

const bodySchema = z.object({ nodeId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: "Невалідний запит" }, { status: 400 });

    return await runProgressionAction(id, characterId, { type: "unlearn", nodeId: parsed.data.nodeId });
  } catch (error) {
    return handleApiError(error, { action: "unlearn skill node" });
  }
}
