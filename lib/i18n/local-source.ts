import type { Locale, Namespace } from "./config";

export const localSource = {
  async load(locale: Locale, namespace: Namespace): Promise<Record<string, unknown>> {
    return (await import(`@/messages/${locale}/${namespace}.json`)).default;
  },
};
