import { discardWorldUploadHandler } from "@/lib/server/world/upload-handler";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return discardWorldUploadHandler(req, (await params).id);
}
