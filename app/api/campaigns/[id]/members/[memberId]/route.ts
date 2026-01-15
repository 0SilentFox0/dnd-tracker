import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    // Перевіряємо права DM
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Перевіряємо чи учасник існує та належить до цієї кампанії
    const member = await prisma.campaignMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
