import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { resourcesEditSchema } from "@/lib/schemas/out-of-combat";
import { editResourcesFor } from "@/lib/server/characters/core/resources-handler";

export const resourcesOperation = defineCharacterOperation({
  name: "resources",
  action: "edit character resources",
  schema: resourcesEditSchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: editResourcesFor,
});

export const PATCH = characterRoute(resourcesOperation);
