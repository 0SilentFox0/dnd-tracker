import { listNotificationsHandler } from "@/lib/server/notifications/handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  return listNotificationsHandler(id);
}
