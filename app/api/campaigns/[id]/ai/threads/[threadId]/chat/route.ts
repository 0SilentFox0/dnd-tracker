import { cancelChatHandler,chatHandler, recoverChatHandler } from "../../../ai-handlers";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return chatHandler(req, id, threadId);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  const query = new URL(req.url).searchParams;

  return recoverChatHandler(id, threadId, query.get("requestId") ?? undefined, query.get("statusOnly") === "1");
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return cancelChatHandler(req, id, threadId);
}
