/**
 * Спільні підписи та збір числових рядків для UI бонусу сету (DM + лист персонажа).
 */

import {
  ARTIFACT_COMBAT_BONUS_OPTIONS,
  ArtifactModifierType,
} from "@/lib/constants/artifacts";
import type { ParsedArtifactSetBonus } from "@/lib/types/artifact-set-bonus";

const BONUS_LABEL_BY_KEY = Object.fromEntries(
  ARTIFACT_COMBAT_BONUS_OPTIONS.map((o) => [o.key, o.label]),
) as Record<string, string>;

export function bonusLineLabel(key: string): string {
  const slot = /^slotBonus_(\d+)$/.exec(key);

  if (slot) {
    return `Слоти заклинань (рівень ${slot[1]})`;
  }

  return BONUS_LABEL_BY_KEY[key] ?? key;
}

export function modifierLineLabel(type: string): string {
  if (type === "min_targets" || type === ArtifactModifierType.MIN_TARGETS) {
    return "Мін. цілей";
  }

  if (type === "max_targets" || type === ArtifactModifierType.MAX_TARGETS) {
    return "Макс. цілей";
  }

  return type;
}

export type SetBonusNumericDisplayLine = {
  label: string;
  value: number;
  isPercentage?: boolean;
};

export function collectSetBonusNumericLines(
  parsed: ParsedArtifactSetBonus,
): SetBonusNumericDisplayLine[] {
  const out: SetBonusNumericDisplayLine[] = [];

  for (const [key, value] of Object.entries(parsed.bonuses)) {
    if (typeof value !== "number" || value === 0) continue;

    out.push({ label: bonusLineLabel(key), value });
  }

  for (const m of parsed.modifiers) {
    out.push({
      label: modifierLineLabel(m.type),
      value: m.value,
      isPercentage: Boolean(m.isPercentage),
    });
  }

  for (const [lvl, add] of Object.entries(parsed.spellSlotBonus)) {
    if (!add) continue;

    out.push({
      label: `Слоти заклинань (рівень ${lvl})`,
      value: add,
    });
  }

  return out;
}
