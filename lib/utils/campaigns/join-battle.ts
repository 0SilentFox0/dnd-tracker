import type { ActiveBattleRef } from "@/types/campaigns";

export const battleHref = (b: ActiveBattleRef) => `/campaigns/${b.campaignId}/battles/${b.id}`;

/** Куди веде «Join Battle»: бій поточної кампанії має пріоритет; на сторінці цього бою кнопка не потрібна */
export function pickJoinBattle(battles: ActiveBattleRef[], pathname: string | null): ActiveBattleRef | null {
  const campaignId = pathname?.match(/^\/campaigns\/([^/]+)/)?.[1];

  const target = battles.find((b) => b.campaignId === campaignId) ?? battles[0] ?? null;

  return target && pathname?.startsWith(battleHref(target)) ? null : target;
}
