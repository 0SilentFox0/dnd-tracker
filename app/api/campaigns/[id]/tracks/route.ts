import { createTrackHandler, getTracksHandler } from "./track-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return getTracksHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createTrackHandler(req, (await params).id);
}
