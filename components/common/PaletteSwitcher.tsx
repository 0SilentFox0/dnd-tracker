"use client";

import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/providers/theme-provider";
import { PALETTE_IDS,PALETTE_SWATCHES } from "@/lib/theme/palettes";
import { cn } from "@/lib/utils";
import type { PaletteId } from "@/types/theme";

export function PaletteSwitcher() {
  const t = useTranslations("common.header.palette");

  const { palette, ready, saving, error, setPalette } = useTheme();

  return (
    <div className="relative">
    <Select value={palette} disabled={!ready || saving} onValueChange={(value) => void setPalette(value as PaletteId)}>
      <SelectTrigger aria-label={t("label")} title={error ? t(`errors.${error}`) : t("label")} className="h-9 w-9 gap-0 border-0 px-2 text-hud-gold shadow-none hover:bg-white/5 [&>svg]:hidden sm:w-[132px] sm:justify-between sm:border sm:border-hud-line sm:px-2.5 sm:[&>svg]:inline-flex" size="sm">
        <SelectValue aria-label={t(`names.${palette}`)}><span aria-hidden className="flex size-4 shrink-0 rounded-full border border-current/30" style={{ background: `linear-gradient(135deg, ${PALETTE_SWATCHES[palette][1]} 0 48%, ${PALETTE_SWATCHES[palette][0]} 48%)` }} /></SelectValue>
        <span className="hidden min-w-0 flex-1 truncate text-left text-sm sm:block">{t(`names.${palette}`)}</span>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[176px]">
        {PALETTE_IDS.map((id) => (
          <SelectItem key={id} value={id}>
            <span aria-hidden className={cn("inline-flex size-4 rounded-full border border-current/30")} style={{ background: `linear-gradient(135deg, ${PALETTE_SWATCHES[id][1]} 0 48%, ${PALETTE_SWATCHES[id][0]} 48%)` }} />
            {t(`names.${id}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <span role="status" className="sr-only">{t(`errors.${error}`)}</span>}
    </div>
  );
}
