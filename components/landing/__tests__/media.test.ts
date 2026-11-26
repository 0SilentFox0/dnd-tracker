import { existsSync } from 'node:fs';
import path from 'node:path';
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

    it('combat triptych maps to screen-combat-N', () => {
        const media = showcaseMedia('uk');

        expect(media.combat1.image).toBe('/landing/uk/screen-combat-1.webp');
        expect(media.combat3.image).toBe('/landing/uk/screen-combat-3.webp');
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
                new RegExp(`^/landing/${l}/screen-[a-z0-9-]+\\.webp$`)
            );
    });
});

describe('FEATURE_ITEMS', () => {
    it('every feature has a screenshot', () => {
        for (const [id, item] of Object.entries(FEATURE_ITEMS))
            expect(item.shot, id).toBeTruthy();
    });
});

const NOT_SHOT_YET: ShowcaseId[] = ['mapEditor'];

describe('screenshot files', () => {
    it.each(LOCALES)('%s: every showcase image exists in public/', (l) => {
        for (const [id, m] of Object.entries(showcaseMedia(l))) {
            if (NOT_SHOT_YET.includes(id as ShowcaseId)) continue;

            expect(
                existsSync(path.join(process.cwd(), 'public', m.image ?? '')),
                `${l}/${id}`
            ).toBe(true);
        }
    });
});
