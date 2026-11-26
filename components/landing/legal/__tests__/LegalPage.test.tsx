import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildLegalMetadata } from '@/components/landing/legal/legal-metadata';
import { LegalPage } from '@/components/landing/legal/LegalPage';
import { BRAND, LEGAL, LEGAL_DOCS } from '@/lib/constants/site';
import { LOCALES } from '@/lib/i18n/config';
import en from '@/messages/en/legal.json';
import uk from '@/messages/uk/legal.json';

vi.unmock('@/lib/i18n/translator');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/hooks/auth/useHasSessionCookie', () => ({ useHasSessionCookie: () => false }));

const render = async (locale: 'en' | 'uk', doc: (typeof LEGAL_DOCS)[number]) =>
    renderToStaticMarkup(await LegalPage({ locale, doc }));

describe('LegalPage', () => {
    it('en privacy names the operator data and the subprocessors', async () => {
        const html = await render('en', 'privacy');

        for (const text of [
            LEGAL.contactEmail,
            LEGAL.operatorName,
            'Supabase',
            'Vercel',
            'Pusher',
            'Resend',
        ])
            expect(html).toContain(text);
    });

    it('uk terms carry the SRD 5.2 attribution', async () => {
        expect(await render('uk', 'terms')).toContain('SRD 5.2');
    });

    it.each(LOCALES.flatMap((l) => LEGAL_DOCS.map((d) => [l, d] as const)))(
        '%s/%s renders one h1, no raw keys and no unresolved placeholders',
        async (locale, doc) => {
            const html = await render(locale, doc);

            expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
            expect(html).not.toContain('legal.');
            expect(html).not.toMatch(/\{[a-zA-Z]+\}/);
            expect(html).toContain(`lang="${locale}"`);
        }
    );

    it('links the landing sections from the nav', async () => {
        expect(await render('en', 'cookies')).toContain('href="/#features"');
        expect(await render('uk', 'cookies')).toContain('href="/uk#features"');
    });

    it('builds metadata with canonical and hreflang', async () => {
        const meta = await buildLegalMetadata('uk', 'privacy');

        expect(meta.alternates?.canonical).toBe('/uk/privacy');
        expect(meta.alternates?.languages).toEqual({
            en: '/privacy',
            uk: '/uk/privacy',
            'x-default': '/privacy',
        });
        expect(JSON.stringify(meta.title)).toContain(BRAND.name);
    });
});

describe('legal messages', () => {
    it('EN has no Cyrillic and both locales have the same sections', () => {
        expect(JSON.stringify(en)).not.toMatch(/[Ѐ-ӿ]/);

        for (const doc of LEGAL_DOCS)
            expect(Object.keys(uk[doc].sections)).toEqual(
                Object.keys(en[doc].sections)
            );
    });

    it('the brand only comes from {brand}', () => {
        for (const m of [en, uk])
            expect(JSON.stringify(m)).not.toContain(BRAND.name);
    });
});
