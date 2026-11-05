import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { rollDyingAt } from "@/lib/utils/battle/death-saves";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function skippedTurnAt(
  order: BattleParticipant[],
  index: number,
  ctx: { rules: Ruleset | undefined; rng: () => number; round: number },
): { participants: BattleParticipant[]; messages: LogLine[] } | null {
  const dying = rollDyingAt(order, index, ctx.rules, ctx.rng);

  if (dying) return dying;

  const p = order[index];

  const conditions = ctx.rules && ruleSystemOf(ctx.rules).conditions;

  if (!p || !conditions || p.combatStats.status !== CombatStatus.UNCONSCIOUS) return null;

  const extra = conditions.skippedTurn?.(order, p.basicInfo.id, { round: ctx.round, rng: ctx.rng });

  const extraMessages = extra?.messages ?? [];

  // збитий ворог без кровотечі щоразу не засмічує журнал
  const quiet = p.basicInfo.side === ParticipantSide.ENEMY && extraMessages.length === 0;

  const skip = quiet ? [] : [textRef("battleLog.turn.skipUnconscious", { name: p.basicInfo.name })];

  return { participants: extra?.participants ?? order, messages: [...skip, ...extraMessages] };
}
