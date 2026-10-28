import { viewHandler } from "@/lib/server/world/view-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;

  return viewHandler(req, id);
}
