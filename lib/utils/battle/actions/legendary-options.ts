import { actionReason } from "./reasons";

import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const legendaryCostOf = (a: ResolvedAbility): number => a.limits?.legendaryCost ?? 0;

export const legendaryAbilities = (p: BattleParticipant): ResolvedAbility[] => (p.battleData.resolvedAbilities ?? []).filter((a) => legendaryCostOf(a) > 0);

export const hasLegendaryActions = (p: BattleParticipant): boolean => (p.battleData.legendary?.actions ?? 0) > 0;

export function legendaryBlocker(p: BattleParticipant, current: BattleParticipant | undefined, cost = 1): LogLine | null {
  const legendary = p.battleData.legendary;

  if (!legendary || legendary.actions <= 0) return actionReason("noLegendary");

  if (current?.basicInfo.id === p.basicInfo.id) return actionReason("legendaryOwnTurn");

  if (!isActive(p) || hasCondition(p, "incapacitated") || p.battleData.reserved) return actionReason("cannotAct");

  return legendary.actionsLeft < cost ? actionReason("legendaryShort", { left: legendary.actionsLeft, cost }) : null;
}

export function spendLegendary(p: BattleParticipant, cost: number): BattleParticipant {
  const legendary = p.battleData.legendary;

  if (!legendary) return p;

  return { ...p, battleData: { ...p.battleData, legendary: { ...legendary, actionsLeft: Math.max(0, legendary.actionsLeft - cost) } } };
}

export function legendaryBadge(p: BattleParticipant): LogLine | null {
  const l = p.battleData.legendary;

  if (!l) return null;

  const parts = [l.actions > 0 ? textRef("battleActions.legendary.badgeActions", { left: l.actionsLeft, max: l.actions }) : null, l.resistLeft > 0 ? textRef("battleActions.legendary.badgeResist", { count: l.resistLeft }) : null].filter((x) => !!x);

  return parts.length > 0 ? joinLines(parts, " · ") : null;
}
