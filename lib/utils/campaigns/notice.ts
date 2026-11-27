export const CAMPAIGN_NOTICES = [
    'dmOnly',
    'mapLibraryDisabled',
    'demoReadOnly',
] as const;

export type CampaignNotice = (typeof CAMPAIGN_NOTICES)[number];

export const CAMPAIGN_NOTICE_PARAM = 'notice';

export function campaignNoticeUrl(
    campaignId: string,
    notice: CampaignNotice
): string {
    return `/campaigns/${campaignId}?${CAMPAIGN_NOTICE_PARAM}=${notice}`;
}

export function parseCampaignNotice(
    value: string | null | undefined
): CampaignNotice | null {
    return (CAMPAIGN_NOTICES as readonly string[]).includes(value ?? '')
        ? (value as CampaignNotice)
        : null;
}

const CAMPAIGN_PATH = /^\/campaigns\/([^/]+)/;

export function campaignIdFromPath(pathname: string | null): string | null {
    const id = CAMPAIGN_PATH.exec(pathname ?? '')?.[1];

    return id && id !== 'new' ? id : null;
}
