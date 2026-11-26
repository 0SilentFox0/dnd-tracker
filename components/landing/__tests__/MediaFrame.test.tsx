import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SHOWCASE_MEDIA, type ShowcaseId } from '@/components/landing/media';
import {
    MEDIA_SIZES,
    Screen,
    ScreenPlaceholder,
} from '@/components/landing/MediaFrame';

describe('MediaFrame sizes', () => {
    it('16/10 sizes cover 4K viewports', () => {
        expect(MEDIA_SIZES.wide).toContain('1800px');
        expect(MEDIA_SIZES.wide).toContain('(min-width: 2560px)');
    });

    it('Screen emits the 4K-aware sizes attribute by default', () => {
        const id = (Object.keys(SHOWCASE_MEDIA) as ShowcaseId[]).find(
            (k) => SHOWCASE_MEDIA[k].image && SHOWCASE_MEDIA[k].ratio !== '9/16'
        );

        if (!id) return;

        const html = renderToStaticMarkup(<Screen id={id} alt="x" />);

        expect(html).toContain('(min-width: 2560px) 1800px');
    });
});

describe('ScreenPlaceholder', () => {
    it('renders a labelled image-less fallback', () => {
        const html = renderToStaticMarkup(<ScreenPlaceholder alt="soon" />);

        expect(html).toContain('role="img"');
        expect(html).toContain('aria-label="soon"');
        expect(html).not.toContain('<img');
    });
});
