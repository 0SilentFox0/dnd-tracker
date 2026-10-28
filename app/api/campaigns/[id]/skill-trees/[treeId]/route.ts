import { NextResponse } from "next/server";
import { z } from "zod";

import { saveSkillTree } from "./save-skill-tree-handler";

import { NEED, type RouteCtx, runContent } from "@/lib/utils/api/content-routes";
import { parseBody } from "@/lib/utils/api/parse-body";

const bodySchema = z.object({ race: z.string().min(1), skills: z.object({ mainSkills: z.array(z.object({ id: z.string() }).passthrough()) }).passthrough() });

export const PATCH = (req: Request, ctx: RouteCtx) =>
  runContent({ req, ctx, need: NEED.write, action: "update skill tree" }, async (actor, p) => {
    const parsed = await parseBody(bodySchema, req, "Невалідне дерево");

    if (parsed instanceof NextResponse) return parsed;

    return saveSkillTree(actor.campaignId, p.treeId, parsed.race, parsed.skills);
  });
