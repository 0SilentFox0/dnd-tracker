import { describe, expect, it } from 'vitest';

import sitemap from '@/app/sitemap';
import { LEGAL_DOCS, LEGAL_PATH, SITE_URL } from '@/lib/constants/site';

describe('sitemap', () => {
    const urls = sitemap().map((e) => e.url);

    it('lists every legal page in both locales', () => {
        expect(urls).toContain(`${SITE_URL}/privacy`);
        expect(urls).toContain(`${SITE_URL}/uk/privacy`);
        expect(urls).toContain(`${SITE_URL}/terms`);
        expect(urls).toContain(`${SITE_URL}/cookies`);

        for (const locale of ['en', 'uk'] as const)
            for (const doc of LEGAL_DOCS)
                expect(urls).toContain(`${SITE_URL}${LEGAL_PATH[locale][doc]}`);
    });

    it('links legal alternates with hreflang', () => {
        const entry = sitemap().find((e) => e.url === `${SITE_URL}/uk/terms`);

        expect(entry?.alternates?.languages).toEqual({
            en: `${SITE_URL}/terms`,
            uk: `${SITE_URL}/uk/terms`,
            'x-default': `${SITE_URL}/terms`,
        });
    });
});
