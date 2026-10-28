import { saveSkillTree } from "./save-skill-tree-handler";

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { operationRoute } from "@/lib/utils/api/content-routes";

export const PATCH = operationRoute(CONTENT_OPERATIONS["skill-trees.save"], ({ actor, params, body }) => saveSkillTree(actor.campaignId, params.treeId, body.race, body.skills));
