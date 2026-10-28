import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { requireDM } from "@/lib/utils/api/api-auth";
import { bundleErrorResponse } from "@/lib/utils/api/bundle-error";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) return accessResult;

    const bundle = await exportCampaign(prisma, id);

    const date = new Date().toISOString().slice(0, 10);

    return NextResponse.json(bundle, {
      headers: { ...PRIVATE_NO_STORE_HEADERS, "Content-Disposition": `attachment; filename="campaign-${id}-${date}.json"` },
    });
  } catch (error) {
    return bundleErrorResponse(error) ?? handleApiError(error, { action: "export campaign" });
  }
}
