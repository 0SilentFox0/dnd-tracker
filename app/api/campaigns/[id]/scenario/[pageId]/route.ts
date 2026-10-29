import { deleteScenarioPageHandler, saveScenarioContentHandler, updateScenarioMetaHandler } from "./page-handlers";

import { getScenarioPageHandler } from "@/lib/server/scenario/read-scenario";

type Params = { params: Promise<{ id: string; pageId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return getScenarioPageHandler(id, pageId);
}

export async function PUT(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return saveScenarioContentHandler(req, id, pageId);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return updateScenarioMetaHandler(req, id, pageId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, pageId } = await params;

  return deleteScenarioPageHandler(id, pageId);
}
