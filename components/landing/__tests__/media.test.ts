import { describe, expect, it } from 'vitest';

import {
    FEATURE_ITEMS,
    type ShowcaseId,
    showcaseMedia,
} from '@/components/landing/media';
import { LOCALES } from '@/lib/i18n/config';

describe('showcaseMedia', () => {
    it('builds locale-prefixed paths', () => {
        expect(showcaseMedia('uk').hero.image).toBe(
            '/landing/uk/screen-hero.webp'
        );
        expect(showcaseMedia('en').combat.image).toBe(
            '/landing/en/screen-battle.webp'
        );
    });

    it('only the phone frame is portrait', () => {
        const media = showcaseMedia('en');

        expect(media.phone.ratio).toBe('9/16');

        for (const id of Object.keys(media) as ShowcaseId[])
            if (id !== 'phone') expect(media[id].ratio, id).toBe('16/10');
    });

    it.each(LOCALES)('%s: every id has an image in its locale folder', (l) => {
        for (const [id, m] of Object.entries(showcaseMedia(l)))
            expect(m.image, id).toMatch(
                new RegExp(`^/landing/${l}/screen-[a-z-]+\\.webp$`)
            );
    });
});

describe('FEATURE_ITEMS', () => {
    it('every feature has a screenshot', () => {
        for (const [id, item] of Object.entries(FEATURE_ITEMS))
            expect(item.shot, id).toBeTruthy();
    });
});

// Files exist only after the shoot (landing-v3 Task 6).
describe.skip('screenshot files (after shooting)', () => {
    it.todo('every showcaseMedia image exists in public/');
});
