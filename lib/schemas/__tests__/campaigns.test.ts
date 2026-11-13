import { describe, expect, it } from 'vitest';

import {
    createCampaignSchema,
    updateCampaignSchema,
} from '@/lib/schemas/campaigns';

describe('create with a system', () => {
    it('accepts a key with modules', () => {
        expect(
            createCampaignSchema.safeParse({
                name: 'A',
                system: { key: 'dnd5e', modules: ['morale'] },
            }).success
        ).toBe(true);
    });

    it('rejects a system together with a template', () => {
        const result = createCampaignSchema.safeParse({
            name: 'A',
            templateId: 't1',
            system: { key: 'dnd5e' },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]).toMatchObject({
            path: ['system'],
            message: 'validation.systemWithTemplate',
        });
    });

    it('rejects malformed module ids', () => {
        expect(
            createCampaignSchema.safeParse({
                name: 'A',
                system: { key: 'dnd5e', modules: ['Bad'] },
            }).success
        ).toBe(false);
    });
});

describe('critChoiceByDm', () => {
    it('update-схема приймає boolean і відкидає інше', () => {
        expect(
            updateCampaignSchema.parse({ critChoiceByDm: true }).critChoiceByDm
        ).toBe(true);
        expect(
            updateCampaignSchema.safeParse({ critChoiceByDm: 'yes' }).success
        ).toBe(false);
        expect(updateCampaignSchema.parse({}).critChoiceByDm).toBeUndefined();
    });

    it('create-схема за замовчуванням false', () => {
        expect(
            createCampaignSchema.parse({ name: 'Зоря' }).critChoiceByDm
        ).toBe(false);
    });
});
