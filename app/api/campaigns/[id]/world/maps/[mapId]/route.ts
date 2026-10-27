import { deleteWorldMapHandler, getWorldMapHandler, updateWorldMapHandler } from "@/lib/server/world/map-handlers";

type Params = { params: Promise<{ id: string; mapId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, mapId } = await params;

  return getWorldMapHandler(id, mapId);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id, mapId } = await params;

  return updateWorldMapHandler(req, id, mapId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, mapId } = await params;

  return deleteWorldMapHandler(id, mapId);
}
