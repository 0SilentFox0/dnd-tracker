import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireDM } from "@/lib/utils/api-auth";
import type { SkillTree } from "@/types/skill-tree";

const updateSkillTreeSchema = z.object({
  skills: z.any(), // SkillTree structure
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; treeId: string }> }
) {
  try {
    const { id, treeId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);
    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();
    const data = updateSkillTreeSchema.parse(body);

    // Перевіряємо чи існує skill tree
    const existingTree = await prisma.skillTree.findUnique({
      where: { id: treeId },
    });

    let updatedTree;
    
    if (!existingTree || existingTree.campaignId !== id) {
      // Якщо skill tree не існує - створюємо новий
      // Витягуємо race з skills (якщо це SkillTree об'єкт)
      const skillsData = data.skills as SkillTree;
      const race = skillsData.race || existingTree?.race || "unknown";
      
      updatedTree = await prisma.skillTree.create({
        data: {
          id: treeId,
          campaignId: id,
          race: race,
          skills: data.skills as any,
        },
      });
    } else {
      // Оновлюємо існуючий skill tree
      updatedTree = await prisma.skillTree.update({
        where: { id: treeId },
        data: {
          skills: data.skills as any,
        },
      });
    }

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
