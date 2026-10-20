import { createDeckHandler, getDecksHandler } from "./deck-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return getDecksHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createDeckHandler(req, (await params).id);
}
