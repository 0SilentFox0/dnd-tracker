import { listProposalsHandler } from "../ai-handlers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return listProposalsHandler(req, (await params).id);
}
