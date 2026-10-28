import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export const legendaryCostOf = (a: ResolvedAbility): number => a.limits?.legendaryCost ?? 0;

export const legendaryAbilities = (p: BattleParticipant): ResolvedAbility[] => (p.battleData.resolvedAbilities ?? []).filter((a) => legendaryCostOf(a) > 0);

export const hasLegendaryActions = (p: BattleParticipant): boolean => (p.battleData.legendary?.actions ?? 0) > 0;

export function legendaryBlocker(p: BattleParticipant, current: BattleParticipant | undefined, cost = 1): string | null {
  const legendary = p.battleData.legendary;

  if (!legendary || legendary.actions <= 0) return "У учасника немає легендарних дій";

  if (current?.basicInfo.id === p.basicInfo.id) return "Легендарна дія — лише поза своїм ходом";

  if (!isActive(p) || hasCondition(p, "incapacitated") || p.battleData.reserved) return "Недієздатний учасник не може діяти";

  return legendary.actionsLeft < cost ? `Не вистачає легендарних дій (${legendary.actionsLeft} з ${cost})` : null;
}

export function spendLegendary(p: BattleParticipant, cost: number): BattleParticipant {
  const legendary = p.battleData.legendary;

  if (!legendary) return p;

  return { ...p, battleData: { ...p.battleData, legendary: { ...legendary, actionsLeft: Math.max(0, legendary.actionsLeft - cost) } } };
}

export function legendaryBadge(p: BattleParticipant): string | null {
  const l = p.battleData.legendary;

  if (!l) return null;

  const parts = [l.actions > 0 ? `Леґ. дії ${l.actionsLeft}/${l.actions}` : null, l.resistLeft > 0 ? `Леґ. опір ${l.resistLeft}` : null].filter((x): x is string => !!x);

  return parts.length > 0 ? parts.join(" · ") : null;
}
