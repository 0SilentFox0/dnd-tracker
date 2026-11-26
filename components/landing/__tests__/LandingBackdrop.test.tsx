import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LandingBackdrop } from '@/components/landing/LandingBackdrop';

describe('LandingBackdrop', () => {
    const html = renderToStaticMarkup(<LandingBackdrop />);

    it('renders four aria-hidden layers', () => {
        for (const cls of ['ld-bg', 'ld-fog', 'ld-light', 'ld-vignette']) {
            expect(html).toMatch(
                new RegExp(`<div[^>]*class="${cls}"[^>]*aria-hidden="true"|<div[^>]*aria-hidden="true"[^>]*class="${cls}"`)
            );
        }
    });

    it('renders three procedural cloud layers inside the fog', () => {
        expect(html.match(/class="ld-cloud ld-cloud-[abc]"/g)).toHaveLength(3);
    });

    it('preloads the 2k background', () => {
        expect(html).toContain('rel="preload"');
        expect(html).toContain('href="/bg/vey-strait-2k.webp"');
        expect(html).toContain('media="(max-width: 1920px)"');
        expect(html.toLowerCase()).toContain('fetchpriority="high"');
    });
});
