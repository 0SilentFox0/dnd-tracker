import { readInventory } from "./read-inventory";
import { updateInventory } from "./update-inventory";

import { handleApiError } from "@/lib/utils/api/error-handler";

type RouteContext = { params: Promise<{ id: string; characterId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    return await updateInventory(request, id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "update inventory" });
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id, characterId } = await params;

    return await readInventory(id, characterId);
  } catch (error) {
    return handleApiError(error, { action: "fetch inventory" });
  }
}
