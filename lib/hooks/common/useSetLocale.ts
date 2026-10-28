"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { localeApi } from "@/lib/api/locale";
import { writeLocaleCookie } from "@/lib/i18n/client-cookie";
import { type Locale,LOCALE_CHANGE_EVENT } from "@/lib/i18n/config";

export function useSetLocale(): { locale: Locale; set: (locale: Locale, hardNavigateTo?: string) => Promise<void> } {
  const locale = useLocale() as Locale;

  const router = useRouter();

  const set = useCallback(
    async (next: Locale, hardNavigateTo?: string) => {
      if (hardNavigateTo) {
        // a failed PUT must not leave the switcher dead: fall back to the cookie and still load the target URL
        await localeApi.set(next).catch(() => writeLocaleCookie(next));
        window.location.assign(hardNavigateTo);

        return;
      }

      await localeApi.set(next).catch(() => writeLocaleCookie(next));
      window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
      router.refresh();
    },
    [router],
  );

  return { locale, set };
}
