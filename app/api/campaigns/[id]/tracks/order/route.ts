import { reorderTracksHandler } from "../track-handlers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return reorderTracksHandler(req, (await params).id);
}
