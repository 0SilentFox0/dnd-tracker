import { issueUploadTicketHandler } from "../track-handlers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return issueUploadTicketHandler(req, (await params).id);
}
