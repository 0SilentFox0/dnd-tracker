import { getSettingsHandler, putSettingsHandler } from "../ai-handlers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return getSettingsHandler((await params).id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return putSettingsHandler(req, (await params).id);
}
