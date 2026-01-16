import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SkillTree } from "@/lib/types/skill-tree";

const updateSkillTreeSchema = z.object({
  skills: z.any(), // SkillTree structure
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; treeId: string }> }
) {
  try {
    const { id, treeId } = await params;
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

    // Перевіряємо чи існує skill tree
    const existingTree = await prisma.skillTree.findUnique({
      where: { id: treeId },
    });

    if (!existingTree || existingTree.campaignId !== id) {
      return NextResponse.json(
        { error: "Skill tree not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateSkillTreeSchema.parse(body);

    // Оновлюємо skill tree
    const updatedTree = await prisma.skillTree.update({
      where: { id: treeId },
      data: {
        skills: data.skills as any,
      },
    });

    return NextResponse.json(updatedTree);
  } catch (error) {
    console.error("Error updating skill tree:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update skill tree" },
      { status: 500 }
    );
  }
}
