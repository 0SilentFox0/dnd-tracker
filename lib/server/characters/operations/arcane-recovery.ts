import { requireCharacterAccess } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { arcaneRecoverySchema } from "@/lib/schemas/out-of-combat";
import { arcaneRecoveryFor } from "@/lib/server/characters/core/arcane-recovery-handler";

export const arcaneRecoveryOperation = defineCharacterOperation({
  name: "arcane-recovery",
  action: "arcane recovery",
  schema: arcaneRecoverySchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: arcaneRecoveryFor,
});

export const POST = characterRoute(arcaneRecoveryOperation);
