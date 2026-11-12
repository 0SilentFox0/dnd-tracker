import { FORTUNE_INPUT } from "../percentile/fortune";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { SystemInputCtx } from "@/lib/utils/rules/systems/types";

export function assertWfrpInput(system: SystemSlot, ctx: SystemInputCtx): void {
  if (!FORTUNE_INPUT.read(system)) return;

  const { actor } = ctx;

  if (ctx.kind === "cast" && ctx.free) throw ruleErrorOf("action_rejected", REJECT.fortuneNotFree);

  const allowed = ctx.kind === "attack" ? ctx.targetCount === 1 : ctx.tested;

  if (!allowed || (actor.battleData.fortune ?? 0) < 1) throw ruleErrorOf("action_rejected", API_ERRORS.NO_FORTUNE);
}
