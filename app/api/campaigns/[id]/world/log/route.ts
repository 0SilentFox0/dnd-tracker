import { logHandler } from "@/lib/server/world/travel-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  return logHandler(id);
}
