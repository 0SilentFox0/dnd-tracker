import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Перевіряємо чи учасник існує та належить до цієї кампанії
    const member = await prisma.campaignMember.findUnique({
      where: { id: memberId },
    });

    const validationError = validateCampaignOwnership(member, id);

    if (validationError) {
      return validationError;
    }

    // Після перевірки member гарантовано не null
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Не дозволяємо видаляти DM
    if (member.role === "dm") {
      return NextResponse.json(
        { error: "Cannot remove DM from campaign" },
        { status: 400 }
      );
    }

    // Видаляємо учасника
    await prisma.campaignMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "remove member" });
  }
}
