"use client";

import { cn } from "@/lib/utils";
import {
  calculateAverageSpellEffect,
  formatSpellAverage,
} from "@/lib/utils/spells/spell-calculations";
import { getSpellTypeIcon } from "@/lib/utils/spells/spell-icons";

export interface SpellRichOptionData {
  id: string;
  name: string;
  level: number;
  type: string;
  damageType: string;
  diceCount?: number | null;
  diceType?: string | null;
  description?: string | null;
  icon?: string | null;
  spellGroup?: { id: string; name: string } | null;
}

interface SpellRichOptionProps {
  spell: SpellRichOptionData;
  /** Показати слоти (наприклад "2/3") — для бою */
  slotLabel?: string;
  disabled?: boolean;
  /** Іконка не завантажилась — показати fallback */
  iconError?: boolean;
  /** Викликати при помилці завантаження іконки */
  onIconError?: () => void;
  className?: string;
  compact?: boolean;
}

export function SpellRichOption({
  spell,
  slotLabel,
  disabled,
  iconError,
  onIconError,
  className,
  compact = false,
}: SpellRichOptionProps) {
  const avg = calculateAverageSpellEffect(spell.diceCount, spell.diceType);

  const damageLabel = formatSpellAverage(spell.damageType, avg);

  const TypeIcon = getSpellTypeIcon(spell.type);

  const showIcon = spell.icon && !iconError;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md p-2 text-left",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {showIcon ? (
          // eslint-disable-next-line @next/next/no-img-element -- external spell icon URL
          <img
            src={spell.icon ?? ""}
            alt=""
            className="h-full w-full object-cover"
            onError={onIconError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <TypeIcon className="h-6 w-6" />
          </div>
        )}
        <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] text-amber-400">
          {spell.level}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{spell.name}</span>
          {spell.type === "aoe" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">AOE</span>
          )}
          {spell.type === "no_target" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
              No target
            </span>
          )}
          {slotLabel != null && (
            <span className="text-muted-foreground text-xs">{slotLabel}</span>
          )}
        </div>
        {!compact && spell.description && (
          <p className="text-muted-foreground mt-1 line-clamp-4 text-xs leading-relaxed">
            {spell.description}
          </p>
        )}
        {damageLabel && (
          <p className="text-muted-foreground mt-1 text-xs">{damageLabel}</p>
        )}
      </div>
    </div>
  );
}
