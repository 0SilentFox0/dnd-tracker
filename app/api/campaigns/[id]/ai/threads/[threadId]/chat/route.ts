import { NextResponse } from "next/server";

import { aiGuard } from "../../../ai-handlers";

import { runChat } from "@/lib/ai/chat/run-chat";
import { chatRequestSchema } from "@/lib/schemas/ai";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  try {
    const { id, threadId } = await params;

    const access = await aiGuard(id);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(chatRequestSchema, req);

    if (body instanceof NextResponse) return body;

    return await runChat({ campaignId: id, userId: access.userId, threadId, text: body.text, focus: body.focus, abortSignal: req.signal });
  } catch (error) {
    return handleApiError(error, { action: "ai chat" });
  }
}
