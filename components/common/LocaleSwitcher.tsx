"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetLocale } from "@/lib/hooks/common";
import type { Locale } from "@/lib/i18n/config";
import { NATIVE_LANGUAGE_NAMES } from "@/lib/i18n/native-language-names";

// with hrefs (landing) the options are real links, so crawlers and no-JS visitors reach the other language
export function LocaleSwitcher({ hrefs }: { hrefs?: Record<Locale, string> }) {
  const { locale, set } = useSetLocale();

  if (!hrefs) {
    return (
      <Select value={locale} onValueChange={(code) => void set(code as Locale)}>
        <SelectTrigger size="sm" aria-label={NATIVE_LANGUAGE_NAMES[locale]} className="w-[88px] border-hud-line text-hud-gold">
          <SelectValue>{locale.toUpperCase()}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {(Object.keys(NATIVE_LANGUAGE_NAMES) as Locale[]).map((code) => (
            <SelectItem key={code} value={code} lang={code}>
              {NATIVE_LANGUAGE_NAMES[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-1" role="group">
      {(Object.keys(NATIVE_LANGUAGE_NAMES) as Locale[]).map((code) => {
        const active = code === locale;

        const label = (
          <>
            {code.toUpperCase()}
            <span className="sr-only">{NATIVE_LANGUAGE_NAMES[code]}</span>
          </>
        );

        const className = active ? "text-hud-gold" : "text-hud-muted";

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
      })}
    </div>
  );
}
