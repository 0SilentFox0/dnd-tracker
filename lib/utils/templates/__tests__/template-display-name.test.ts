import { describe, expect, it } from 'vitest';

import { CampaignKind, CampaignVisibility } from '@/lib/constants/campaigns';
import {
    DEFAULT_TEMPLATE_KEY,
    templateDisplayName,
    templateOf,
} from '@/lib/utils/templates/registry';

const official = {
    kind: CampaignKind.TEMPLATE,
    visibility: CampaignVisibility.OFFICIAL,
    templateKey: DEFAULT_TEMPLATE_KEY,
    name: 'stored',
};

describe('templateDisplayName', () => {
    it('uses the manifest name for the UI locale', () => {
        const names = templateOf(DEFAULT_TEMPLATE_KEY)!.names;

        expect(templateDisplayName(official, 'uk')).toBe(names.uk);
        expect(templateDisplayName(official, 'en')).toBe(names.en);
    });

    it('keeps the stored name for non-official templates', () => {
        expect(
            templateDisplayName(
                { ...official, visibility: CampaignVisibility.PRIVATE },
                'uk'
            )
        ).toBe('stored');
    });
});
