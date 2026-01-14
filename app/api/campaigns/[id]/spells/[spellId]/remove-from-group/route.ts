import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
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

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    if (!spell || spell.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        groupId: null,
      },
      include: {
        spellGroup: true,
      },
    });

    return NextResponse.json(updatedSpell);
  } catch (error) {
    console.error("Error removing spell from group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
