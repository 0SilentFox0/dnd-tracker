import type { MoraleScope } from "@/lib/utils/battle/morale/awaits-check";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { ActGateBlock } from "@/lib/utils/rules/systems/types";

type GateCtx = MoraleScope & { meta: { rules: Ruleset } };

function firstBlock(ctx: GateCtx, participantId: string, phase: "act" | "end", skipCheck?: boolean): ActGateBlock | null {
  const scope = { participants: ctx.participants, scene: ctx.scene, rules: ctx.meta.rules };

  for (const gate of ruleSystemOf(ctx.meta.rules).combat.turn?.actGates ?? []) {
    const block = gate(scope, participantId, { phase, skipCheck });

    if (block) return block;
  }

  return null;
}

function assertNoBlock(ctx: GateCtx, participantId: string, phase: "act" | "end", skipCheck?: boolean): void {
  const block = firstBlock(ctx, participantId, phase, skipCheck);

  if (block) throw new BattleRuleError(block.code, block.key);
}

export const assertCanAct = (ctx: GateCtx, participantId: string, opts: { skipMorale?: boolean } = {}): void => assertNoBlock(ctx, participantId, "act", opts.skipMorale);

export const assertCanEndTurn = (ctx: GateCtx, participantId: string): void => assertNoBlock(ctx, participantId, "end");
