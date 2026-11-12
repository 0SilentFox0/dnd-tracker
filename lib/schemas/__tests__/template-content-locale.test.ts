import { expect, it } from 'vitest';

import { createCampaignSchema, updateCampaignSchema } from '../campaigns';
import { cloneCampaignSchema, saveAsTemplateSchema } from '../templates';

it('accepts allowlisted content locale only for creation and clone', () => {
    for (const schema of [createCampaignSchema, cloneCampaignSchema]) {
        expect(schema.parse({ name: 'N', contentLocale: 'uk' })).toMatchObject({
            contentLocale: 'uk',
        });
        expect(
            schema.safeParse({ name: 'N', contentLocale: 'fr' }).success
        ).toBe(false);
    }
    expect(
        saveAsTemplateSchema.parse({ name: 'N', contentLocale: 'uk' })
    ).not.toHaveProperty('contentLocale');
    expect(
        updateCampaignSchema.parse({ contentLocale: 'uk' })
    ).not.toHaveProperty('contentLocale');
});
