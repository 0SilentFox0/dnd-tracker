import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { type ShowcaseId, showcaseMedia } from '@/components/landing/media';
import { MEDIA_SIZES, Screen } from '@/components/landing/MediaFrame';

describe('MediaFrame sizes', () => {
    it('16/10 sizes cover 4K viewports', () => {
        expect(MEDIA_SIZES.wide).toContain('1800px');
        expect(MEDIA_SIZES.wide).toContain('(min-width: 2560px)');
    });

    it('Screen emits the 4K-aware sizes attribute by default', () => {
        const media = showcaseMedia('en');

        const id = (Object.keys(media) as ShowcaseId[]).find(
            (k) => media[k].image && media[k].ratio !== '9/16'
        );

        if (!id) return;

        const html = renderToStaticMarkup(
            <Screen id={id} locale="en" alt="x" />
        );

        expect(html).toContain('(min-width: 2560px) 1800px');
    });
});
