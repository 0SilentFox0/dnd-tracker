import { NextResponse } from "next/server";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { saveSkillTree } from "@/lib/server/skills/skill-tree-service";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const PATCH = operationRoute(CONTENT_OPERATIONS["skill-trees.save"], async ({ actor, params, body }) => {
  const saved = await saveSkillTree(actor, { treeId: params.treeId, race: body.race, skills: body.skills });

  return NextResponse.json({ id: saved.id, race: saved.race, skills: saved.skills });
});
