import { applyProposalHandler } from "../../../ai-handlers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  const { id, proposalId } = await params;

  return applyProposalHandler(id, proposalId);
}
