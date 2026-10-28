import { markNotificationsReadHandler } from "@/lib/server/notifications/handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  return markNotificationsReadHandler(req, id);
}
