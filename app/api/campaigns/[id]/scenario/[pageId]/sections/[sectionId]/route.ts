import { patchScenarioSectionHandler } from "./section-handler";

type Params = { params: Promise<{ id: string; pageId: string; sectionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, pageId, sectionId } = await params;

  return patchScenarioSectionHandler(req, id, pageId, sectionId);
}
