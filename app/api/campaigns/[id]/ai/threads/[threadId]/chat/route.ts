import { cancelChatHandler,chatHandler, recoverChatHandler } from "../../../ai-handlers";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return chatHandler(req, id, threadId);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return recoverChatHandler(id, threadId, new URL(_req.url).searchParams.get("requestId") ?? undefined);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return cancelChatHandler(req, id, threadId);
}
