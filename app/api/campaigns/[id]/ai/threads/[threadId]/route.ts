import { deleteThreadHandler, patchThreadHandler } from "../../ai-handlers";

type Ctx = { params: Promise<{ id: string; threadId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, threadId } = await params;

  return patchThreadHandler(req, id, threadId);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, threadId } = await params;

  return deleteThreadHandler(id, threadId);
}
