import { saveNoteHandler } from "@/lib/server/acquaintances/note-handlers";

type Params = { params: Promise<{ id: string; acquaintanceId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id, acquaintanceId } = await params;

  return saveNoteHandler(req, id, acquaintanceId);
}
