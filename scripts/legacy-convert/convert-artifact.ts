import { mapLegacyEffect } from "./stat-map";
import type { ConversionIssue, ConversionResult, ConvertOptions, LegacyEffect } from "./types";

import { parseEffectScopeObject } from "@/lib/constants/artifact-effect-scope";
import { AttackType } from "@/lib/constants/battle";
import type { AbilityTarget, Effect, StatKey } from "@/lib/utils/abilities/schema";
import { legacyDamageKindOf } from "@/lib/utils/abilities/schema";
import { matchesAttackBonusModifier } from "@/lib/utils/battle/common/modifiers";
import { isRecord } from "@/lib/utils/common/is-record";

const BONUS_STATS: Record<string, StatKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
  armorClass: "armor",
  speed: "speed",
  initiative: "initiative",
  morale: "morale",
  minTargets: "minTargets",
  maxTargets: "maxTargets",
};


export function scopeOf(effectScope: unknown): { target?: AbilityTarget; immuneSpellIds: string[] } {
  const { effectAudience, immuneSpellIds } = parseEffectScopeObject(effectScope);

  const target = effectAudience === "all_allies" ? "allAllies" : effectAudience === "all_enemies" ? "allEnemies" : undefined;

  return { ...(target && { target }), immuneSpellIds: immuneSpellIds ?? [] };
}

// weapon attack bonus is read by attack extraction, not converted to an ability
const WEAPON_BONUS_KEYS = new Set(["attackBonus", "attack"]);

export function mapBonuses(bonuses: unknown, skipBaked: boolean, issues: ConversionIssue[]): Effect[] {
  if (!isRecord(bonuses) || skipBaked) return [];

  const out: Effect[] = [];

  for (const [key, raw] of Object.entries(bonuses)) {
    if (typeof raw !== "number" || raw === 0 || WEAPON_BONUS_KEYS.has(key)) continue;

    const slot = /^slotBonus_(\d)$/.exec(key);

    if (slot) out.push({ kind: "modifyStat", stat: "spellSlots", spellLevels: [Number(slot[1])], flat: raw });
    else if (BONUS_STATS[key]) out.push({ kind: "modifyStat", stat: BONUS_STATS[key], flat: raw });
    else issues.push({ severity: "loss", message: `Бонус ${key} не переноситься` });
  }

  return out;
}

export function mapModifiers(modifiers: unknown, opts: { skipBaked: boolean; skipTargets: boolean }, issues: ConversionIssue[]): Effect[] {
  if (!Array.isArray(modifiers)) return [];

  const out: Effect[] = [];

  for (const m of modifiers) {
    if (!isRecord(m) || typeof m.type !== "string") continue;

    const value = typeof m.value === "number" ? m.value : Number.parseFloat(String(m.value));

    if (!Number.isFinite(value) || value === 0) continue;

    const type = m.type.toLowerCase();

    const damageKind = legacyDamageKindOf(type);

    if (damageKind) {
      out.push({ kind: "damageBonus", filter: { kind: damageKind }, ...(m.isPercentage ? { percent: value } : { flat: value }) });
      continue;
    }

    const melee = matchesAttackBonusModifier(type, AttackType.MELEE);

    const ranged = matchesAttackBonusModifier(type, AttackType.RANGED);

    if (!m.isPercentage && (melee || ranged)) {
      const attackKind = melee && ranged ? {} : { attackKind: ranged ? ("ranged" as const) : ("melee" as const) };

      out.push({ kind: "modifyStat", stat: "attackBonus", ...attackKind, flat: value });
      continue;
    }

    if (type === "min_targets" || type === "max_targets") {
      if (!opts.skipBaked && !opts.skipTargets) out.push({ kind: "modifyStat", stat: type === "min_targets" ? "minTargets" : "maxTargets", flat: value });

      continue;
    }

    issues.push({ severity: "loss", message: `Модифікатор ${m.type} не переноситься` });
  }

  return out;
}

export function mapPassiveEffects(effects: unknown, skipBaked: boolean, issues: ConversionIssue[]): Effect[] {
  const out: Effect[] = [];

  for (const e of Array.isArray(effects) ? (effects as Partial<LegacyEffect>[]) : []) {
    if (!isRecord(e) || typeof e.stat !== "string") continue;

    const legacy: LegacyEffect = {
      stat: e.stat,
      type: e.type ?? "flat",
      value: e.value ?? 0,
      isPercentage: e.isPercentage === true || e.type === "percent",
    };

    const r = mapLegacyEffect(legacy, { trigger: { event: "passive" }, damageKindOverride: null, school: null, skipBakedStats: skipBaked, emitExtras: false });

    out.push(...r.effects);
    issues.push(...r.issues);
  }

  return out;
}

export function withTarget(effects: Effect[], target: AbilityTarget | undefined): Effect[] {
  return target ? effects.map((e) => (e.kind === "note" ? e : ({ ...e, target } as Effect))) : effects;
}

export function convertLegacyArtifact(
  row: { id: string; name: string; slot?: string | null; bonuses: unknown; modifiers: unknown; passiveAbility: unknown },
  opts: ConvertOptions = {},
): ConversionResult {
  const issues: ConversionIssue[] = [];

  const skipBaked = opts.skipBakedStats === true;

  const passive = isRecord(row.passiveAbility) ? row.passiveAbility : {};

  const scope = scopeOf(passive.effectScope);

  const effects: Effect[] = [
    ...mapBonuses(row.bonuses, skipBaked, issues),
    ...mapModifiers(row.modifiers, { skipBaked, skipTargets: row.slot === "weapon" }, issues),
    ...mapPassiveEffects(passive.effects, skipBaked, issues),
  ];

  if (scope.immuneSpellIds.length) effects.push({ kind: "flag", flag: "spellImmunity", spellIds: scope.immuneSpellIds });

  const abilities: ConversionResult["abilities"] = [];

  if (effects.length) abilities.push({ id: "bonuses", name: row.name, trigger: { event: "passive" }, effects: withTarget(effects, scope.target) });

  const trigger = isRecord(passive.trigger) ? passive.trigger.type : undefined;

  if (trigger === "start_of_battle") {
    abilities.push({ id: "start", name: row.name, trigger: { event: "battleStart" }, effects: [{ kind: "note", text: row.name }] });
    issues.push({ severity: "loss", message: "Ефект початку бою артефакта — лише нотатка" });
  }

  return { abilities, issues };
}
