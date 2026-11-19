import { describe, expect, it } from 'vitest';

import { EDITION_PROFILES, editionOf } from '..';

import { WFRP_RULES_PRESET } from '@/systems/wfrp/rules/rules-preset';

describe('edition switch', () => {
    it('campaigns without the item stay on legacy', () => {
        expect(editionOf({})).toBe(EDITION_PROFILES.legacy);
        expect(editionOf(null)).toBe(EDITION_PROFILES.legacy);
        expect(editionOf({ edition: { preset: 'nope' } })).toBe(
            EDITION_PROFILES.legacy
        );
    });

    it('reads the canon preset', () => {
        expect(editionOf({ edition: { preset: 'canon5e' } })).toBe(
            EDITION_PROFILES.canon5e
        );
    });

    it('new campaigns start on the 5e canon', () => {
        expect(WFRP_RULES_PRESET.edition.preset).toBe('canon5e');
    });

    it('legacy profile carries the pre-5e behaviour', () => {
        expect(EDITION_PROFILES.legacy).toMatchObject({
            advanceStep: 1,
            slModel: 'clamped',
            opposedModel: 'attackerMustSucceed',
            attackTarget: 'characteristic',
            momentumModel: 'side',
        });
    });
});
