import { parseDieInput } from "./die-input";

import { textRef } from "@/lib/i18n/text-ref";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { SpellMagicKind } from "@/lib/utils/spells/model/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const PERCENTILE_SIDES = 100;

export const TENS_OPTIONS = Array.from({ length: 10 }, (_, i) => i * 10);

/** Tens die (00-90) plus units die (0-9); 00 + 0 reads as 100. */
export function composePercentile(tens: number | undefined, units: number | undefined): number | undefined {
  if (tens === undefined || units === undefined) return undefined;

  return tens + units || PERCENTILE_SIDES;
}

export const parsePercentileField = (raw: string) => parseDieInput(raw, PERCENTILE_SIDES);

/** Base target the roll is compared with (before outnumbering and Momentum); null outside percentile systems. */
export function percentileTargetOf(attacker: BattleParticipant, attack: BattleAttack, rules: Ruleset): { target: number; label: LogLine } | null {
  const resolved = ruleSystemOf(rules).combat.attackTarget?.(attacker, attack);

  return resolved ? { target: resolved.target, label: textRef(`gameTerms.characteristics.${resolved.characteristic}.label`) } : null;
}

/** Casting-test numbers shown before the roll; null outside systems with a casting test. */
export function castPreviewOf(caster: BattleParticipant, rules: Ruleset, kind?: SpellMagicKind): { target: number; channelTarget: number; channelled: number; armourSl: number } | null {
  return ruleSystemOf(rules).magic?.castPreview(caster, kind) ?? null;
}
