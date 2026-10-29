"use client";

import { useTranslations } from "next-intl";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Label } from "@/components/ui/label";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/common/format";

const DEFAULT_SCORE = 10;

interface AbilityScoresGridProps {
  data: Partial<Record<AbilityKey, number | null>>;
  set: (key: AbilityKey, value: number) => void;
  showModifier?: boolean;
}

export function AbilityScoresGrid({ data, set, showModifier = false }: AbilityScoresGridProps) {
  const t = useTranslations("gameTerms.abilities");

  return (
    <div className="grid w-full grid-cols-3 items-end gap-2 sm:grid-cols-6">
      {ABILITY_KEYS.map((key) => {
        const value = data[key] ?? DEFAULT_SCORE;

        return (
          <div key={key} className="w-full min-w-0">
            <Label htmlFor={key} className="text-xs leading-tight">
              {t(`${key}.label`)}
              {showModifier && <span className="text-muted-foreground"> ({signed(getAbilityModifier(value))})</span>}
            </Label>
            <BoundedNumberInput id={key} min={1} max={30} value={value} onCommit={(v) => set(key, v)} className="w-full" />
          </div>
        );
      })}
    </div>
  );
}
