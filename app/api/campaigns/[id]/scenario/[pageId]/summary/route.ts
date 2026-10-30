import { generateSummaryHandler } from "./summary-handler";

export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;

  return generateSummaryHandler(req, id, pageId);
}
