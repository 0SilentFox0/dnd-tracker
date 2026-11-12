import { arcaneRecoveryFor } from "./handlers/arcane-recovery-handler";

import { arcaneRecoverySchema } from "@/lib/schemas/out-of-combat";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { defineCharacterOperation, gateOptions } from "@/lib/server/characters/operation-runner";

export const arcaneRecoveryOperation = defineCharacterOperation({
  name: "arcane-recovery",
  action: "arcane recovery",
  schema: arcaneRecoverySchema,
  gate: ctx => requireCharacterAccess(ctx.campaignId, ctx.characterId, gateOptions(ctx)),
  run: arcaneRecoveryFor,
});
