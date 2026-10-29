import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { archetypeLabel, heroMagicMultiplier } from "@/lib/utils/battle/damage/hero-dm-multiplier";
import { getSpellSaveDC } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

const ABILITY_LABELS = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" } as const;

function spellcastingModifier(p: BattleParticipant): { mod: number; label: string } {
  const ability = p.spellcasting?.spellcastingAbility;

  if (!ability) return { mod: 0, label: "" };

  return { mod: p.abilities.modifiers[ability], label: ABILITY_LABELS[ability] };
}

/** Предмет-зброя із заклинання: мод. від характеристики кастера, а без неї — від кращої з STR/DEX власника. */
function weaponModifier(p: BattleParticipant): { mod: number; label: string } {
  if (p.spellcasting?.spellcastingAbility) return spellcastingModifier(p);

  const { strength, dexterity } = p.abilities.modifiers;

  return strength >= dexterity ? { mod: strength, label: ABILITY_LABELS.strength } : { mod: dexterity, label: ABILITY_LABELS.dexterity };
}

export function spellSaveDc(caster: BattleParticipant, ability: keyof BattleParticipant["abilities"]["modifiers"] | undefined, saveDcBase: number): number {
  const modifier = ability ? caster.abilities.modifiers[ability] : spellcastingModifier(caster).mod;

  const computed = getSpellSaveDC(caster.abilities.proficiencyBonus, modifier, saveDcBase);

  return ability ? computed : (caster.spellcasting.spellSaveDC ?? computed);
}

export function spellAttackBonus(caster: BattleParticipant, weapon = false): number {
  if (weapon && !caster.spellcasting.spellcastingAbility) return caster.abilities.proficiencyBonus + weaponModifier(caster).mod;

  return caster.spellcasting.spellAttackBonus ?? caster.abilities.proficiencyBonus + spellcastingModifier(caster).mod;
}

export interface SpellPower {
  heal: number;
  damage: number;
  breakdown: string[];
}

export function computeSpellPower(input: {
  caster: BattleParticipant;
  groupId: string | null;
  rolls: number[];
  participants: BattleParticipant[];
  extra?: StaticEffect[];
  addAbilityMod?: boolean;
  damageBonus?: number;
}): SpellPower {
  const { caster, rolls } = input;

  if (rolls.length === 0) return { heal: 0, damage: 0, breakdown: [] };

  const sum = rolls.reduce((a, b) => a + b, 0);

  const breakdown = [`+ сума кубиків (${sum})`];

  const heal = sum + (input.damageBonus ?? 0);

  const mods = collectModifiers(withSelf(input.participants, caster), caster.basicInfo.id, { damage: { kind: "magic", school: input.groupId } }, input.extra);

  const percentBonus = Math.floor((sum * mods.percent) / 100);

  for (const e of mods.entries) {
    if (e.flat) breakdown.push(`+ бонус ${e.label} (${signed(e.flat)})`);

    if (e.percent) breakdown.push(`+ бонус ${e.label}: ${e.percent}% від ${sum} (${signed(Math.floor((sum * e.percent) / 100))})`);
  }

  const abilityMod = isFiveE(caster) && input.addAbilityMod ? weaponModifier(caster) : null;

  if (abilityMod) breakdown.push(`+ мод. ${abilityMod.label} (${signed(abilityMod.mod)})`);

  if (input.damageBonus) breakdown.push(`+ бонус заклинання (${signed(input.damageBonus)})`);

  const raw = heal + mods.flat + percentBonus + (abilityMod?.mod ?? 0);

  const mult = heroMagicMultiplier(caster);

  const damage = mult === 1 ? raw : Math.floor(raw * mult);

  if (mult !== 1) breakdown.push(`× ${mult} (${archetypeLabel(caster)}) = ${damage}`);

  return { heal: heal + (abilityMod?.mod ?? 0), damage, breakdown };
}
