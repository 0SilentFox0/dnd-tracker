import { requireCharacterRow } from "../access";
import { characterRoute, defineCharacterOperation, gateOptions } from "../operation-runner";

import { inspirationSchema } from "@/lib/schemas/out-of-combat";
import { setInspiration } from "@/lib/server/characters/core/set-inspiration";

export const inspirationOperation = defineCharacterOperation({
  name: "inspiration",
  action: "set inspiration",
  schema: inspirationSchema,
  gate: ctx => requireCharacterRow(ctx.campaignId, ctx.characterId, gateOptions(ctx, true)),
  run: (gate, body) => setInspiration(gate, body.value),
});

export const POST = characterRoute(inspirationOperation);
