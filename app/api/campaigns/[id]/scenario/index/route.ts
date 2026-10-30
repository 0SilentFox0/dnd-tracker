import { scenarioIndexHandler } from "./index-handler";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return scenarioIndexHandler((await params).id);
}
