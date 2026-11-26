import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LandingFooter } from '@/components/landing/chrome';
import { LEGAL_DOCS, LEGAL_PATH } from '@/lib/constants/site';
import { LOCALES } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';

vi.unmock('@/lib/i18n/translator');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe.each(LOCALES)('LandingFooter (%s)', (locale) => {
    it('links privacy, terms and cookies of the locale', async () => {
        const html = renderToStaticMarkup(
            <LandingFooter
                t={await getTranslator(locale, 'landing')}
                locale={locale}
            />
        );

        for (const doc of LEGAL_DOCS)
            expect(html).toContain(`href="${LEGAL_PATH[locale][doc]}"`);

        expect(html).toContain('SRD 5.2');
    });
});
