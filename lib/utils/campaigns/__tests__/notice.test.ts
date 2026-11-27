import { describe, expect, it } from 'vitest';

import {
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
