import { NextResponse } from "next/server";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { importUnitsSchema } from "@/lib/schemas/units";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { importUnitsIntoCampaign } from "@/lib/utils/units/import-units";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const parsed = await parseBody(importUnitsSchema, request);

    if (parsed instanceof NextResponse) return parsed;

    const { units } = parsed;

    const report = await importUnitsIntoCampaign(prisma, id, units);

    invalidateReference(ReferenceKind.UNITS, id);

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, { action: "import units" });
  }
}
