import { deleteDeckHandler, getDeckHandler, saveDeckHandler, setDeckSceneHandler } from "../deck-handlers";

type Params = { params: Promise<{ id: string; deckId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return getDeckHandler(id, deckId);
}

export async function PUT(req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return saveDeckHandler(req, id, deckId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return deleteDeckHandler(id, deckId);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id, deckId } = await params;

  return setDeckSceneHandler(req, id, deckId);
}
