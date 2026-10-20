import { listVersionsHandler, restoreVersionHandler } from "./versions-handlers";

type Params = { params: Promise<{ id: string; pageId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return listVersionsHandler(id, pageId);
}

export async function POST(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return restoreVersionHandler(req, id, pageId);
}
