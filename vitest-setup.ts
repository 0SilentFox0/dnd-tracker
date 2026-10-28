import { vi } from "vitest";

// ~500 of the 700 files run in node and never touch DOM matchers; loading jest-dom there costs ~60 s of setup per run
if (typeof document !== "undefined") await import("@testing-library/jest-dom/vitest");

// next/font only works inside the Next compiler; components that import components/hud/fonts need a stub
vi.mock("next/font/google", () => ({
  Alegreya: () => ({ variable: "" }),
  Alegreya_SC: () => ({ variable: "" }),
  Alegreya_Sans: () => ({ variable: "" }),
  EB_Garamond: () => ({ variable: "" }),
}));

// підказки онбордингу тягнуть TanStack Query й мережу; у тестах екранів вони не потрібні (власний тест робить vi.unmock)
vi.mock("@/components/onboarding/OnboardingHint", () => ({ OnboardingHint: () => null, PlayerSheetHint: () => null }));

// next-intl у тестах повертає ключ з префіксом namespace; справжні переклади — через renderWithIntl (lib/i18n/test)
vi.mock("next-intl", async () => {
  const { makeT } = await import("@/lib/i18n/test/mock-t");

  return {
    useTranslations: (namespace?: string) => makeT(namespace),
    useLocale: () => "uk",
    useFormatter: () => ({
      number: (value: number) => String(value),
      dateTime: (value: Date | number) => new Date(value).toISOString(),
      relativeTime: (value: Date | number) => String(value),
      list: (values: Iterable<string>) => [...values].join(", "),
    }),
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
  };
});

vi.mock("next-intl/server", async () => {
  const { makeT } = await import("@/lib/i18n/test/mock-t");

  return {
    getTranslations: async (arg?: string | { namespace?: string }) => makeT(typeof arg === "string" ? arg : arg?.namespace),
    getLocale: async () => "uk",
    getFormatter: async () => ({ number: (value: number) => String(value) }),
  };
});

vi.mock("@/lib/i18n/translator", async () => {
  const { makeT } = await import("@/lib/i18n/test/mock-t");

  return { getTranslator: async (_locale: string, namespace?: string) => makeT(namespace) };
});

vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: async () => "uk" }));

// lib/db створює PrismaClient під час імпорту; без URL падають навіть тести, що не ходять у БД
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/test";
