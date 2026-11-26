import type { Locale } from '@/lib/i18n/config';

export const SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dnd-tracker-omega.vercel.app'
).replace(/\/$/, '');

// off until the public launch: robots.txt disallows everything and pages carry noindex
export const SITE_INDEXING = process.env.SITE_INDEXING === '1';

// working name: the single place to rename the product
export const BRAND = {
    name: 'CritNest',
    short: 'CN',
} as const;

export const LANDING_PATH = { en: '/', uk: '/uk' } as const satisfies Record<
    Locale,
    string
>;

export const LANDING_PATHS: string[] = Object.values(LANDING_PATH);

// operator data is a placeholder until the owner fills it in: grep TODO-operator
export const LEGAL = {
    operatorName: 'TODO-operator-name',
    operatorAddress: 'TODO-operator-address',
    contactEmail: 'privacy@critnest.com',
    jurisdiction: 'TODO-jurisdiction',
    updatedAt: '2026-11-26',
} as const;

export const LEGAL_DOCS = ['privacy', 'terms', 'cookies'] as const;

export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const LEGAL_PATH = {
    en: { privacy: '/privacy', terms: '/terms', cookies: '/cookies' },
    uk: { privacy: '/uk/privacy', terms: '/uk/terms', cookies: '/uk/cookies' },
} as const satisfies Record<Locale, Record<LegalDoc, string>>;

export const LEGAL_PATHS: string[] = Object.values(LEGAL_PATH).flatMap((p) =>
    Object.values(p)
);

/** Statically rendered public pages: the proxy skips the Supabase round trip and the app header stays hidden. */
export const STATIC_PUBLIC_PATHS: string[] = [...LANDING_PATHS, ...LEGAL_PATHS];
