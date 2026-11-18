import { vi } from 'vitest';

// ~500 of the 700 files run in node and never touch DOM matchers; loading jest-dom there costs ~60 s of setup per run
if (typeof document !== 'undefined') {
    await import('@testing-library/jest-dom/vitest');
}

// only the rules root: server/UI roots drag the whole server/component graph into the module cache before a test's vi.mock registers; tests import those roots themselves
await import('@/lib/utils/rules/systems/registry');

process.env.DATABASE_URL ??=
    'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// next/font only works inside the Next compiler; components that import components/hud/fonts need a stub
vi.mock('next/font/google', () => ({
    Alegreya: () => ({ variable: '' }),
    Alegreya_SC: () => ({ variable: '' }),
    Alegreya_Sans: () => ({ variable: '' }),
    EB_Garamond: () => ({ variable: '' }),
}));

// onboarding hints pull TanStack Query and the network; screen tests do not need them (their own test does vi.unmock)
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: () => null,
    PlayerSheetHint: () => null,
}));

// next-intl in tests returns the key with a namespace prefix; real translations go through renderWithIntl
vi.mock('next-intl', async () => {
    const { makeT } = await import('@/lib/i18n/test/mock-t');

    return {
        useTranslations: (namespace?: string) => makeT(namespace),
        useLocale: () => 'uk',
        useFormatter: () => ({
            number: (value: number) => String(value),
            dateTime: (value: Date | number) => new Date(value).toISOString(),
            relativeTime: (value: Date | number) => String(value),
            list: (values: Iterable<string>) => [...values].join(', '),
        }),
        NextIntlClientProvider: ({ children }: { children: unknown }) =>
            children,
    };
});

vi.mock('next-intl/server', async () => {
    const { makeT } = await import('@/lib/i18n/test/mock-t');

    return {
        getTranslations: async (arg?: string | { namespace?: string }) =>
            makeT(typeof arg === 'string' ? arg : arg?.namespace),
        getLocale: async () => 'uk',
        getFormatter: async () => ({
            number: (value: number) => String(value),
        }),
    };
});

vi.mock('@/lib/i18n/translator', async () => {
    const { makeT } = await import('@/lib/i18n/test/mock-t');

    return {
        getTranslator: async (_locale: string, namespace?: string) =>
            makeT(namespace),
    };
});

vi.mock('@/lib/i18n/request-locale', () => ({
    getRequestLocale: async () => 'uk',
}));

// lib/db creates PrismaClient on import; without a URL even tests that never hit the DB fail
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:1/test';
