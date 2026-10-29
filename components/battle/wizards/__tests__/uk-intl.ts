import type { Locale } from "@/lib/i18n/config";

/** next-intl mock for wizard tests: battleWizards, common.actions and `TextRef` lines render real catalog text, other namespaces stay keys. */
export async function catalogIntl(locale: Locale = "uk") {
  const { makeT } = await import("@/lib/i18n/test/mock-t");

  const { textOf } = await import("@/lib/i18n/test/text");

  const real = (namespace?: string) => {
    const t = (key: string, values?: Record<string, string | number>) => textOf({ message: namespace ? `${namespace}.${key}` : key, params: values }, locale);

    return Object.assign(t, { has: () => true, raw: () => ({}), rich: t, markup: t });
  };

  return {
    useTranslations: (namespace?: string) => (!namespace || namespace.startsWith("battleWizards") || namespace === "common.actions" ? real(namespace) : makeT(namespace)),
    useLocale: () => locale,
    useFormatter: () => ({ number: (value: number) => String(value), dateTime: (value: Date | number) => new Date(value).toISOString(), relativeTime: (value: Date | number) => String(value), list: (values: Iterable<string>) => [...values].join(", ") }),
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
  };
}
