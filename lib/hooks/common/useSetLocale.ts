"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { localeApi } from "@/lib/api/locale";
import { LOCALE_CHANGE_EVENT } from "@/lib/i18n/client-locale-provider";
import { type Locale } from "@/lib/i18n/config";

export function useSetLocale(): { locale: Locale; set: (locale: Locale, navigateTo?: string) => Promise<void> } {
  const locale = useLocale() as Locale;

  const router = useRouter();

  const set = useCallback(
    async (next: Locale, navigateTo?: string) => {
      await localeApi.set(next);
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));

      if (navigateTo) router.push(navigateTo);
      else router.refresh();
    },
    [router],
  );

  return { locale, set };
}
