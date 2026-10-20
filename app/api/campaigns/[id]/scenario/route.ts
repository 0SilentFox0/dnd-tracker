import { createScenarioHandler, listScenarioHandler } from "./scenario-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return listScenarioHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createScenarioHandler(req, (await params).id);
}
