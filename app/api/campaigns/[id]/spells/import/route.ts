import { importSpells } from "./import-spells";

import { handleApiError } from "@/lib/utils/api/error-handler";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    return await importSpells(request, id);
  } catch (error) {
    return handleApiError(error, { action: "import spells" });
  }
}
