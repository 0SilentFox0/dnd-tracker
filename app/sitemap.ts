import type { MetadataRoute } from 'next';

import {
    LANDING_PATH,
    LEGAL_DOCS,
    LEGAL_PATH,
    SITE_URL,
} from '@/lib/constants/site';
import { LOCALES } from '@/lib/i18n/config';

const landingUrl = (path: string) =>
    path === '/' ? SITE_URL : `${SITE_URL}${path}`;

const LANDING_LANGUAGES = {
    ...Object.fromEntries(LOCALES.map((l) => [l, landingUrl(LANDING_PATH[l])])),
    'x-default': SITE_URL,
};

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        ...LOCALES.map((l) => ({
            url: landingUrl(LANDING_PATH[l]),
            changeFrequency: 'weekly' as const,
            priority: 1,
            alternates: { languages: LANDING_LANGUAGES },
        })),
        ...LEGAL_DOCS.flatMap((doc) => {
            const languages = {
                ...Object.fromEntries(
                    LOCALES.map((l) => [l, `${SITE_URL}${LEGAL_PATH[l][doc]}`])
                ),
                'x-default': `${SITE_URL}${LEGAL_PATH.en[doc]}`,
            };

            return LOCALES.map((l) => ({
                url: `${SITE_URL}${LEGAL_PATH[l][doc]}`,
                changeFrequency: 'yearly' as const,
                priority: 0.3,
                alternates: { languages },
            }));
        }),
        {
            url: `${SITE_URL}/sign-up`,
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${SITE_URL}/sign-in`,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];
}
