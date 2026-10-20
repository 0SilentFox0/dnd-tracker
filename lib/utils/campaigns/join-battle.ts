import type { ActiveBattleRef } from "@/types/campaigns";

export const battleHref = (b: ActiveBattleRef) => `/campaigns/${b.campaignId}/battles/${b.id}`;

/** Ціль кнопки в шапці: сесія поточної кампанії має пріоритет; на її сторінці кнопка не потрібна */
export function pickActiveTarget<T extends { campaignId: string }>(items: T[], pathname: string | null, hrefOf: (item: T) => string): T | null {
  const campaignId = pathname?.match(/^\/campaigns\/([^/]+)/)?.[1];

  const target = items.find((i) => i.campaignId === campaignId) ?? items[0] ?? null;

  return target && pathname?.startsWith(hrefOf(target)) ? null : target;
}

export const pickJoinBattle = (battles: ActiveBattleRef[], pathname: string | null) => pickActiveTarget(battles, pathname, battleHref);
