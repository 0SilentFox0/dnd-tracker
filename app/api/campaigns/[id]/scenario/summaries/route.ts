import { listSummariesHandler } from "./summaries-handler";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return listSummariesHandler(id);
}
