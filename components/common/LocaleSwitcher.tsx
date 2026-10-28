"use client";

import { Button } from "@/components/ui/button";
import { useSetLocale } from "@/lib/hooks/common";
import type { Locale } from "@/lib/i18n/config";

const LABELS: Record<Locale, string> = {
  // eslint-disable-next-line no-restricted-syntax -- native language name
  uk: "Українська",
  en: "English",
};

export function LocaleSwitcher({ hrefs }: { hrefs?: Record<Locale, string> }) {
  const { locale, set } = useSetLocale();

  return (
    <div className="flex items-center gap-1" role="group">
      {(Object.keys(LABELS) as Locale[]).map((code) => (
        <Button
          key={code}
          variant="ghost"
          size="sm"
          lang={code}
          aria-pressed={code === locale}
          className={code === locale ? "text-hud-gold" : "text-hud-muted"}
          onClick={() => void set(code, hrefs?.[code])}
        >
          {code.toUpperCase()}
          <span className="sr-only">{LABELS[code]}</span>
        </Button>
      ))}
    </div>
  );
}
