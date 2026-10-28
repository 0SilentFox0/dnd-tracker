import type { Locale, Namespace } from "./config";
import type { MessageSource } from "./source";

export const localSource: MessageSource = {
  async load(locale: Locale, namespace: Namespace) {
    return (await import(`@/messages/${locale}/${namespace}.json`)).default;
  },
};
