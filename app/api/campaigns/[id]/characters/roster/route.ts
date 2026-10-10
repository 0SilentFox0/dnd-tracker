import { readRoster } from "./read-roster";

import { handleApiError } from "@/lib/utils/api/error-handler";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    return await readRoster(id);
  } catch (error) {
    return handleApiError(error, { action: "fetch roster" });
  }
}
