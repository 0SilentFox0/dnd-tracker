import { createAcquaintanceHandler, listAcquaintancesHandler } from "@/lib/server/acquaintances/handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  return listAcquaintancesHandler(id);
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  return createAcquaintanceHandler(req, id);
}
