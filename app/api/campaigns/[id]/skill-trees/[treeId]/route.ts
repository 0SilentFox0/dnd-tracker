import { NextResponse } from "next/server";
import { z } from "zod";

import { saveSkillTree } from "./save-skill-tree-handler";

import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

const bodySchema = z.object({ race: z.string().min(1), skills: z.object({ mainSkills: z.array(z.object({ id: z.string() }).passthrough()) }).passthrough() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; treeId: string }> }) {
  try {
    const { id, treeId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const parsed = await parseBody(bodySchema, request, "Невалідне дерево");

    if (parsed instanceof NextResponse) return parsed;

    return await saveSkillTree(id, treeId, parsed.race, parsed.skills);
  } catch (error) {
    return handleApiError(error, { action: "update skill tree" });
  }
}
