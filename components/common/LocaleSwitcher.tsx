"use client";

import { Button } from "@/components/ui/button";
import { useSetLocale } from "@/lib/hooks/common";
import type { Locale } from "@/lib/i18n/config";

const LABELS: Record<Locale, string> = {
  // eslint-disable-next-line no-restricted-syntax -- native language name
  uk: "Українська",
  en: "English",
};

// with hrefs (landing) the options are real links, so crawlers and no-JS visitors reach the other language
export function LocaleSwitcher({ hrefs }: { hrefs?: Record<Locale, string> }) {
  const { locale, set } = useSetLocale();

  return (
    <div className="flex items-center gap-1" role="group">
      {(Object.keys(LABELS) as Locale[]).map((code) => {
        const active = code === locale;

        const label = (
          <>
            {code.toUpperCase()}
            <span className="sr-only">{LABELS[code]}</span>
          </>
        );

        const className = active ? "text-hud-gold" : "text-hud-muted";

        if (hrefs) {
          return (
            <Button key={code} asChild variant="ghost" size="sm" className={className}>
              <a
                href={hrefs[code]}
                hrefLang={code}
                lang={code}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  void set(code, hrefs[code]);
                }}
              >
                {label}
              </a>
            </Button>
          );
        }

        return (
          <Button key={code} variant="ghost" size="sm" lang={code} aria-pressed={active} className={className} onClick={() => void set(code)}>
            {label}
          </Button>
        );
      })}
    </div>
  );
}
