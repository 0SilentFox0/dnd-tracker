import { listMessagesHandler } from "../../../ai-handlers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return listMessagesHandler(id, threadId);
}
