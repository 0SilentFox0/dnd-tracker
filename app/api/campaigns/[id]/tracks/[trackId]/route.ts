import { deleteTrackHandler, updateTrackHandler } from "../track-handlers";

type Params = { params: Promise<{ id: string; trackId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, trackId } = await params;

  return updateTrackHandler(req, id, trackId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, trackId } = await params;

  return deleteTrackHandler(id, trackId);
}
