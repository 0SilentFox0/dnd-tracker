import { issueWorldUploadHandler } from "@/lib/server/world/upload-handler";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return issueWorldUploadHandler(req, (await params).id);
}
