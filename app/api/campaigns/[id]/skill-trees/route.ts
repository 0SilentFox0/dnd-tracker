import { NextResponse } from "next/server";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { listSkillTrees } from "@/lib/server/skills/skill-tree-service";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const GET = operationRoute(CONTENT_OPERATIONS["skill-trees.list"], async ({ actor }) => NextResponse.json(await listSkillTrees(actor)));
