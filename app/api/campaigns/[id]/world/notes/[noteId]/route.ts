import { deleteNoteHandler, updateNoteHandler } from "@/lib/server/world/note-handlers";

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, noteId } = await params;

  return updateNoteHandler(req, id, noteId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, noteId } = await params;

  return deleteNoteHandler(id, noteId);
}
