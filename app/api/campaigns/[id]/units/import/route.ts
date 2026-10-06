import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { importUnitsSchema } from "@/lib/schemas/units";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
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

    const { units } = importUnitsSchema.parse(await request.json());

    const report = await importUnitsIntoCampaign(prisma, id, units);

    revalidateTag(`units-${id}`, { expire: 0 });

    return NextResponse.json(report);
  } catch (error) {
    return handleApiError(error, { action: "import units" });
  }
}
