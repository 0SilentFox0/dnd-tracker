import { deleteWorldMarkerHandler, updateWorldMarkerHandler } from "@/lib/server/world/marker-handlers";

type Params = { params: Promise<{ id: string; markerId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, markerId } = await params;

  return updateWorldMarkerHandler(req, id, markerId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, markerId } = await params;

  return deleteWorldMarkerHandler(id, markerId);
}
