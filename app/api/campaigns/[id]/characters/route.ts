

import { createCharacter } from "./create-character";
import { listCharacters } from "./list-characters";

import { handleApiError } from "@/lib/utils/api/error-handler";
import type { CampaignRouteContext } from "@/types/api";

export async function POST(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await createCharacter(request, id);
  } catch (error) {
    return handleApiError(error, { action: "create character" });
  }
}

export async function GET(request: Request, { params }: CampaignRouteContext) {
  try {
    const { id } = await params;

    return await listCharacters(request, id);
  } catch (error) {
    return handleApiError(error, { action: "list characters" });
  }
}

export { DELETE } from "@/lib/server/characters/operations/delete-all";
