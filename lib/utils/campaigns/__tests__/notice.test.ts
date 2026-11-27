import { describe, expect, it } from 'vitest';

import {
    campaignIdFromPath,
    campaignNoticeUrl,
    parseCampaignNotice,
} from '@/lib/utils/campaigns/notice';

describe('campaign notice', () => {
    it('builds the redirect url with the notice param', () => {
        expect(campaignNoticeUrl('c1', 'dmOnly')).toBe(
            '/campaigns/c1?notice=dmOnly'
        );
    });

    it('parses known keys only', () => {
        expect(parseCampaignNotice('demoReadOnly')).toBe('demoReadOnly');
        expect(parseCampaignNotice('bogus')).toBeNull();
        expect(parseCampaignNotice(null)).toBeNull();
    });
});

describe('campaignIdFromPath', () => {
    it('extracts the id inside a campaign route', () => {
        expect(campaignIdFromPath('/campaigns/abc/dm/nope')).toBe('abc');
        expect(campaignIdFromPath('/campaigns/abc')).toBe('abc');
    });

    it('returns null outside a campaign', () => {
        expect(campaignIdFromPath('/campaigns')).toBeNull();
        expect(campaignIdFromPath('/campaigns/new')).toBeNull();
        expect(campaignIdFromPath('/admin/x')).toBeNull();
        expect(campaignIdFromPath(null)).toBeNull();
    });
});
