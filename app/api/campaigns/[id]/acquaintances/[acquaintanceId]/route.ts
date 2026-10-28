import { deleteAcquaintanceHandler, updateAcquaintanceHandler } from "@/lib/server/acquaintances/handlers";

type Params = { params: Promise<{ id: string; acquaintanceId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, acquaintanceId } = await params;

  return updateAcquaintanceHandler(req, id, acquaintanceId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, acquaintanceId } = await params;

  return deleteAcquaintanceHandler(id, acquaintanceId);
}
