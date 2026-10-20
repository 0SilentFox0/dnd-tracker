export const showHref = (campaignId: string) => `/campaigns/${campaignId}/show`;

export function pickWatchShow(shows: { campaignId: string }[], pathname: string | null): { campaignId: string } | null {
  const campaignId = pathname?.match(/^\/campaigns\/([^/]+)/)?.[1];

  const target = shows.find((s) => s.campaignId === campaignId) ?? shows[0] ?? null;

  return target && pathname?.startsWith(showHref(target.campaignId)) ? null : target;
}
