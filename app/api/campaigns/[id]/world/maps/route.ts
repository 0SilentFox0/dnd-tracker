import { createWorldMapHandler, listWorldMapsHandler } from "@/lib/server/world/map-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return listWorldMapsHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createWorldMapHandler(req, (await params).id);
}
