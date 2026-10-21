import { discardGeneratedImageHandler } from "../../ai/ai-handlers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return discardGeneratedImageHandler(req, (await params).id);
}
