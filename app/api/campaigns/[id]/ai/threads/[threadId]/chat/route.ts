import { chatHandler } from "../../../ai-handlers";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; threadId: string }> }) {
  const { id, threadId } = await params;

  return chatHandler(req, id, threadId);
}
