import { createNoteHandler } from "@/lib/server/world/note-handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  return createNoteHandler(req, id);
}
