import type { Metadata } from 'next';

import { BRAND, LEGAL_PATH, type LegalDoc } from '@/lib/constants/site';
import type { Locale } from '@/lib/i18n/config';
import { getTranslator } from '@/lib/i18n/translator';

export async function buildLegalMetadata(
    locale: Locale,
    doc: LegalDoc
): Promise<Metadata> {
    const t = await getTranslator(locale, 'legal');

    const title = t('meta.title', {
        doc: t(`${doc}.title`),
        brand: BRAND.name,
    });

    return {
        title: { absolute: title },
        description: t(`meta.descriptions.${doc}`, { brand: BRAND.name }),
        alternates: {
            canonical: LEGAL_PATH[locale][doc],
            languages: {
                en: LEGAL_PATH.en[doc],
                uk: LEGAL_PATH.uk[doc],
                'x-default': LEGAL_PATH.en[doc],
            },
        },
        openGraph: {
            type: 'website',
            url: LEGAL_PATH[locale][doc],
            siteName: BRAND.name,
            title,
        },
    };
}
