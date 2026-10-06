import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const result = await prisma.unit.deleteMany({ where: { campaignId: id } });

    revalidateTag(`units-${id}`, { expire: 0 });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    return handleApiError(error, { action: "delete all units" });
  }
}
