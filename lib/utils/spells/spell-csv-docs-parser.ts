/**
 * Parser for docs/SPELLS.csv format.
 * Columns: Spell_Name, Level, Spell_School, Casting_Time, Range, Duration,
 * Save_Type, Target_AoE, Damage_Heal, Additional_Effects, Image.
 */

import {
  SpellDamageType,
  SpellSavingThrowAbility,
  SpellSavingThrowOnSuccess,
  SpellType,
} from "@/lib/constants/spell-abilities";
import type { ImportSpell } from "@/lib/types/spell-import";

const SAVE_TYPE_MAP: Record<string, SpellSavingThrowAbility> = {
  Constitution: SpellSavingThrowAbility.CONSTITUTION,
  Wisdom: SpellSavingThrowAbility.WISDOM,
  Dexterity: SpellSavingThrowAbility.DEXTERITY,
  Strength: SpellSavingThrowAbility.STRENGTH,
  Intelligence: SpellSavingThrowAbility.INTELLIGENCE,
  Charisma: SpellSavingThrowAbility.CHARISMA,
};

const DAMAGE_ELEMENT_KEYWORDS: Array<{ value: string; keywords: string[] }> = [
  { value: "fire", keywords: ["fire"] },
  { value: "cold", keywords: ["cold", "ice"] },
  { value: "lightning", keywords: ["lightning"] },
  { value: "necrotic", keywords: ["necrotic"] },
  { value: "radiant", keywords: ["radiant"] },
  { value: "force", keywords: ["force"] },
  { value: "piercing", keywords: ["piercing"] },
  { value: "bludgeoning", keywords: ["bludgeoning"] },
  { value: "slashing", keywords: ["slashing"] },
  { value: "acid", keywords: ["acid"] },
  { value: "poison", keywords: ["poison"] },
  { value: "thunder", keywords: ["thunder"] },
  { value: "psychic", keywords: ["psychic"] },
];

function normalizeSchool(school: string): string {
  return school.trim().replace(/_/g, " ");
}

function getTypeFromTargetAoE(targetAoE: string): SpellType {
  const t = targetAoE.trim().toLowerCase();
  if (t === "single target" || t === "single ally") return SpellType.TARGET;
  return SpellType.AOE;
}

function getDamageTypeFromDamageHeal(damageHeal: string): SpellDamageType {
  const d = damageHeal.trim().toLowerCase();
  if (d === "none") return SpellDamageType.DAMAGE;
  if (d.includes("heal") || d.includes(" hp") || d.includes("hp "))
    return SpellDamageType.HEAL;
  return SpellDamageType.DAMAGE;
}

function extractDamageDice(damageHeal: string): string | undefined {
  const match = damageHeal.match(/(\d+)\s*d\s*(\d+)(?:\s*\+\s*\d+)?/i);
  if (!match) return undefined;
  const rest = damageHeal.slice(damageHeal.indexOf(match[0]) + match[0].length);
  const plus = damageHeal.includes("+") ? damageHeal.match(/\+\s*(\d+)/)?.[1] : null;
  const base = `${match[1]}d${match[2]}`;
  return plus ? `${base}+${plus}` : base;
}

function extractDamageElement(damageHeal: string, additionalEffects: string): string | undefined {
  const combined = `${damageHeal} ${additionalEffects}`.toLowerCase();
  for (const { value, keywords } of DAMAGE_ELEMENT_KEYWORDS) {
    if (keywords.some((k) => combined.includes(k))) return value;
  }
  return undefined;
}

export interface DocsSpellRow {
  Spell_Name?: string;
  Level?: string;
  Spell_School?: string;
  Casting_Time?: string;
  Range?: string;
  Duration?: string;
  Save_Type?: string;
  Target_AoE?: string;
  Damage_Heal?: string;
  Additional_Effects?: string;
  Image?: string;
  [key: string]: string | undefined;
}

/**
 * Parse a single row from docs/SPELLS.csv into the format expected by the spell import API.
 */
export function parseDocsSpellRow(row: DocsSpellRow): ImportSpell {
  const spellName = (row.Spell_Name ?? "").trim().replace(/\s+/g, " ");
  const levelRaw = (row.Level ?? "0").trim();
  const level = Math.min(5, Math.max(0, parseInt(levelRaw, 10) || 0));
  const schoolRaw = (row.Spell_School ?? "").trim();
  const school = schoolRaw ? normalizeSchool(schoolRaw) : undefined;
  const targetAoE = (row.Target_AoE ?? "").trim();
  const type = getTypeFromTargetAoE(targetAoE);
  const damageHeal = (row.Damage_Heal ?? "").trim();
  const damageType = getDamageTypeFromDamageHeal(damageHeal);
  const castingTime = (row.Casting_Time ?? "1 action").trim();
  const range = (row.Range ?? "").trim() || undefined;
  const duration = (row.Duration ?? "").trim() || undefined;
  const saveType = (row.Save_Type ?? "").trim();
  const savingThrowAbility = saveType && saveType.toLowerCase() !== "none"
    ? (SAVE_TYPE_MAP[saveType] as SpellSavingThrowAbility | undefined)
    : undefined;
  const damageDice = extractDamageDice(damageHeal);
  const additionalEffects = (row.Additional_Effects ?? "").trim();
  const damageElement = extractDamageElement(damageHeal, additionalEffects);
  const description = additionalEffects || damageHeal || spellName;
  const icon = (row.Image ?? "").trim() || undefined;

  return {
    name: spellName,
    level,
    school,
    type,
    damageType,
    castingTime,
    range,
    duration,
    concentration: false,
    damageDice,
    damageElement,
    savingThrowAbility,
    savingThrowOnSuccess: savingThrowAbility
    ? SpellSavingThrowOnSuccess.HALF
    : undefined,
    description,
    icon: icon || null,
  };
}
