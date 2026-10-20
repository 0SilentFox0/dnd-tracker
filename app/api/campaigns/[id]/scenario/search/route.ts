import { searchScenarioHandler } from "./search-handler";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return searchScenarioHandler(req, (await params).id);
}
