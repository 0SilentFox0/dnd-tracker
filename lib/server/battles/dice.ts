import { API_ERRORS } from "@/lib/constants/api-errors";
import { createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { ContentError } from "@/lib/server/content/errors";
import { validateAttackRequest } from "@/lib/utils/battle/attack-phase/request";
import { attackReachError } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import { rollDie } from "@/lib/utils/common/dice";
import { rngOf } from "@/lib/utils/common/rng";

const rollKeys = new Set(["d10Roll", "d20Roll", "attackRoll", "attackRolls", "secondRolls", "advantageRoll", "disadvantageRoll", "damageRolls", "diceRolls", "saveRolls", "roll", "rolls"]);

export function assertDiceMode(body: Record<string, unknown>, mode: string) {
  if (mode !== "manual" && Object.keys(body).some(key => rollKeys.has(key))) throw new ContentError(API_ERRORS.ASSISTANT_DICE_NEED_MANUAL, 400);

  if (body.preview !== undefined) throw new ContentError(API_ERRORS.ASSISTANT_PREVIEW_SERVER_ONLY, 400);
}

/** A schema placeholder only; never appears as a rolled result or reaches the engine. */
export function schemaDiceInput(operation: string, body: Record<string, unknown>, server: boolean) {
  if (server && operation === "morale-check") return { ...body, d10Roll: 1 };

  return server && operation === "attack" ? { ...body, d20Roll: 1 } : body;
}
export function validateAttackPreview(ctx: BattleMutationContext, body: Record<string, unknown>) {
  const request = { ...body, attackerId: String(body.attackerId), damageRolls: (body.damageRolls ?? []) as number[] };

  const checked = validateAttackRequest(ctx, request);

  const reach = attackReachError(ctx.meta.map, ctx.participants, checked.attacker, checked.attack, checked.chosenTargets);

  if (reach) throw ruleErrorOf("action_rejected", reach);
}
export function withServerBattleDice(operation: string, definition: RunBattleMutationOptions<unknown>): RunBattleMutationOptions<unknown> {
  if (operation === "spell") return { ...definition, mutate: createSpellMutation(undefined, { serverRolls: true }) as RunBattleMutationOptions<unknown>["mutate"] };

  if (operation === "attack") return { ...definition, mutate: createAttackMutation(undefined, { serverRolls: true }) as RunBattleMutationOptions<unknown>["mutate"] };

  if (operation === "morale-check") return { ...definition, mutate: (ctx, raw) => definition.mutate(ctx, { ...(raw as Record<string, unknown>), d10Roll: rollDie(10, rngOf(ctx)) }) };

  return definition;
}
