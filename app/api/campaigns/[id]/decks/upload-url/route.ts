import { issueSlideUploadHandler } from "../deck-handlers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return issueSlideUploadHandler(req, (await params).id);
}
