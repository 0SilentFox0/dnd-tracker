import { generateSlideImageHandler } from "../../ai/ai-handlers";

export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return generateSlideImageHandler(req, (await params).id);
}
