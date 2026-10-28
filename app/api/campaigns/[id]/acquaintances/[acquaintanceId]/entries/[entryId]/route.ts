import { deleteEntryHandler, updateEntryHandler } from "@/lib/server/acquaintances/entry-handlers";

type Params = { params: Promise<{ id: string; acquaintanceId: string; entryId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, acquaintanceId, entryId } = await params;

  return updateEntryHandler(req, id, acquaintanceId, entryId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, acquaintanceId, entryId } = await params;

  return deleteEntryHandler(id, acquaintanceId, entryId);
}
