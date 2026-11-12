import type { ActiveBattleRef } from '@/types/campaigns';

export const battleHref = (b: ActiveBattleRef) =>
    `/campaigns/${b.campaignId}/battles/${b.id}`;

/** Ціль кнопки в шапці: сесія поточної кампанії має пріоритет; на її сторінці кнопка не потрібна */
export function pickActiveTarget<T extends { campaignId: string }>(
    items: T[],
    pathname: string | null,
    hrefOf: (item: T) => string
): T | null {
    const campaignId = pathname?.match(/^\/campaigns\/([^/]+)/)?.[1];

    // Inside a campaign, never fall back to another campaign's live session.
    const target = campaignId
        ? (items.find((i) => i.campaignId === campaignId) ?? null)
        : (items[0] ?? null);

    return target && pathname?.startsWith(hrefOf(target)) ? null : target;
}

export const pickJoinBattle = (
    battles: ActiveBattleRef[],
    pathname: string | null
) => pickActiveTarget(battles, pathname, battleHref);
