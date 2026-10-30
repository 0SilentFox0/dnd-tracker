import { multiplierRow } from "./rows";

import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import type { BattleParticipant, DamageRow } from "@/types/battle";
import type { LogLine } from "@/types/text";

function clampHeroDamageMultiplier(raw: number | undefined | null): number {
  const x = raw ?? 1;

  if (!Number.isFinite(x)) return 1;

  return Math.max(0.1, Math.min(3, x));
}

const ARCHETYPE_ROW_REFS = {
  universal: textRef("battleLog.damage.rows.archetypeOf.universal"),
  warrior: textRef("battleLog.damage.rows.archetypeOf.warrior"),
  paladin: textRef("battleLog.damage.rows.archetypeOf.paladin"),
  ranger: textRef("battleLog.damage.rows.archetypeOf.ranger"),
  rogue: textRef("battleLog.damage.rows.archetypeOf.rogue"),
  mage: textRef("battleLog.damage.rows.archetypeOf.mage"),
} as const;

export function archetypeRef(p: BattleParticipant): LogLine {
  const key = p.abilities.archetypeKey;

  if (key && key in ARCHETYPE_ROW_REFS) return ARCHETYPE_ROW_REFS[key];

  return p.abilities.archetypeName ? textRef("battleLog.damage.rows.archetypeNamed", { name: p.abilities.archetypeName }) : textRef("battleLog.damage.rows.archetype");
}

export function heroMagicMultiplier(p: BattleParticipant): number {
  if (p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) return 1;

  return clampHeroDamageMultiplier(p.abilities.magicMultiplier);
}

/** Після модифікаторів скілів/артефактів; перед дробленням по цілях / опором. */
export function applyHeroDmDamageMultiplier(
  attacker: BattleParticipant,
  attackType: AttackType,
  physicalDamage: number,
): { damage: number; breakdownRow: DamageRow | null; multiplier: number } {
  if (attacker.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) {
    return { damage: physicalDamage, breakdownRow: null, multiplier: 1 };
  }

  const mult =
    attackType === AttackType.MELEE
      ? clampHeroDamageMultiplier(attacker.abilities.meleeMultiplier)
      : clampHeroDamageMultiplier(attacker.abilities.rangedMultiplier);

  if (mult === 1) {
    return { damage: physicalDamage, breakdownRow: null, multiplier: 1 };
  }

  const damage = Math.floor(physicalDamage * mult);

  return {
    damage,
    breakdownRow: multiplierRow(archetypeRef(attacker), mult, damage),
    multiplier: mult,
  };
}
