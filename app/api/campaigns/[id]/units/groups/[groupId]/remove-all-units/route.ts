import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { id, groupId } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
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

    // Перевіряємо чи існує група
    const group = await prisma.unitGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.campaignId !== id) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Видаляємо зв'язок з групою у всіх юнітів цієї групи
    await prisma.unit.updateMany({
      where: {
        campaignId: id,
        groupId,
      },
      data: {
        groupId: null,
        groupColor: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing all units from group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
