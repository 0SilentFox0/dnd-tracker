import { createWorldMarkerHandler } from "@/lib/server/world/marker-handlers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return createWorldMarkerHandler(req, (await params).id);
}
