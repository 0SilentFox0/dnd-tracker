import { createEntryHandler } from "@/lib/server/acquaintances/entry-handlers";

type Params = { params: Promise<{ id: string; acquaintanceId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id, acquaintanceId } = await params;

  return createEntryHandler(req, id, acquaintanceId);
}
