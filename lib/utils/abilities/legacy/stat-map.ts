import type { ConversionIssue, LegacyEffect } from "./types";

import {
  type Ability,
  type AbilityTarget,
  type DamageFilterKind,
  type DamageKind,
  type Duration,
  type Effect,
  type Flat,
  isActionScopedTrigger,
  type StatKey,
  type Trigger,
} from "@/lib/utils/abilities/schema";

export interface StatMapContext {
  trigger: Trigger;
  damageKindOverride: DamageKind | null;
  school: string | null;
  skipBakedStats: boolean;
  emitExtras: boolean;
}

export interface StatMapResult {
  effects: Effect[];
  extras: Omit<Ability, "id" | "name">[];
  beforeEffects: Effect[];
  counterPercent?: number;
  issues: ConversionIssue[];
}

const DAMAGE: Record<string, DamageFilterKind> = {
  melee_damage: "melee",
  ranged_damage: "ranged",
  all_damage: "all",
  damage: "all",
  physical_damage: "physical",
  magic_damage: "magic",
  spell_damage: "magic",
  chaos_spell_damage: "magic",
  dark_spell_damage: "magic",
};

const DOT: Record<string, string> = { bleed_damage: "bleed", poison_damage: "poison", burn_damage: "burn", fire_damage: "fire" };

const PASSIVE_BAKED: Record<string, StatKey> = {
  hp_bonus: "maxHp",
  speed: "speed",
  min_targets: "minTargets",
  min_targets_bonus: "minTargets",
  max_targets: "maxTargets",
  max_targets_bonus: "maxTargets",
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
};

const NOT_AUTOMATED = new Set([
  "area_damage",
  "area_cells",
  "attack_before_enemy",
  "control_units",
  "summon_tier",
  "redirect_physical_damage",
  "marked_targets",
  "spell_levels",
  "spell_targets_lvl4_5",
  "light_spells_target_all_allies",
  "damage_resistance",
]);

const LEGACY_TARGET: Record<string, AbilityTarget> = { self: "self", all_allies: "allAllies", all_enemies: "allEnemies", enemy: "eventTarget" };

function num(e: LegacyEffect): number | null {
  if (typeof e.value === "number") return e.value;

  if (typeof e.value === "string" && /^-?\d+(\.\d+)?$/.test(e.value)) return Number(e.value);

  return null;
}

function flatOf(e: LegacyEffect): Flat | null {
  if (e.type === "formula" && typeof e.value === "string" && e.value) return { formula: e.value };

  return num(e);
}

const hasEventTarget = (t: Trigger) => ["attack", "hit", "spellCast", "kill", "bonusAction"].includes(t.event);

export function mapLegacyEffect(e: LegacyEffect, ctx: StatMapContext): StatMapResult {
  const out: StatMapResult = { effects: [], extras: [], beforeEffects: [], issues: [] };

  const { trigger } = ctx;

  const passive = trigger.event === "passive";

  const isHitAttacker = trigger.event === "hit" && trigger.role === "attacker";

  const legacyTarget = e.target ? LEGACY_TARGET[e.target] : undefined;

  const target = (fallback: AbilityTarget): { target?: AbilityTarget } => {
    const t = legacyTarget ?? fallback;

    return t === "self" ? {} : { target: t };
  };

  const timing = (fallbackRounds: number): { duration?: Duration } => {
    if (passive || (isActionScopedTrigger(trigger) && !e.duration)) return {};

    return { duration: { rounds: Math.min(99, Math.max(1, e.duration ?? fallbackRounds)) } };
  };

  const note = (reason: string) => {
    out.effects.push({ kind: "note", text: `${e.stat}: ${String(e.value)}` });
    out.issues.push({ severity: "loss", message: `${e.stat}: ${reason}` });
  };

  const extra = (ability: Omit<Ability, "id" | "name">) => {
    if (ctx.emitExtras) out.extras.push(ability);
  };

  const flat = flatOf(e);

  const value = num(e);

  if (DAMAGE[e.stat]) {
    let kind = DAMAGE[e.stat];

    const o = ctx.damageKindOverride;

    if (o && kind === "all") kind = o;
    else if (o && kind !== o && !(kind === "physical" && o !== "magic")) {
      out.issues.push({ severity: "loss", message: `${e.stat}: не діяв через тип шкоди скіла (${o})` });

      return out;
    }

    if (flat === null) return (note("нечислове значення"), out);

    const school = kind === "magic" && ctx.school ? { school: ctx.school } : {};

    const bonus: Effect = {
      kind: "damageBonus",
      filter: { kind, ...school },
      ...(e.isPercentage && typeof flat === "number" ? { percent: flat } : { flat }),
    };

    if (isHitAttacker && !(e.target === "all_allies")) {
      out.beforeEffects.push(bonus);
      out.issues.push({ severity: "behavior", message: `${e.stat}: тепер діє лише на атаку (раніше — завжди)` });

      return out;
    }

    out.effects.push({ ...bonus, ...target(trigger.event === "battleStart" ? "allAllies" : "self"), ...timing(trigger.event === "hit" ? 2 : 1) } as Effect);

    return out;
  }

  if (DOT[e.stat]) {
    if (passive) return (note("DOT у пасивці не має події"), out);

    const amount = typeof e.value === "string" && e.value ? e.value : value;

    if (amount === null || amount === "" || (typeof amount === "number" && amount <= 0)) return (note("нечислове значення"), out);

    if (!legacyTarget && !hasEventTarget(trigger)) return (note("DOT без цілі"), out);

    out.effects.push({ kind: "dot", damagePerRound: amount, damageType: DOT[e.stat], duration: { rounds: Math.min(99, e.duration ?? 1) }, target: legacyTarget === "self" ? "eventTarget" : (legacyTarget ?? "eventTarget") });

    return out;
  }

  switch (e.stat) {
    case "counter_damage":
      out.counterPercent = value ?? 0;

      return out;
    case "morale_per_kill":
    case "morale_per_ally_death":
      if (value) extra({ trigger: { event: "kill", role: e.stat === "morale_per_kill" ? "killerSide" : "victimSide" }, effects: [{ kind: "changeMorale", delta: Math.trunc(value) }] });

      return out;
    case "see_enemy_hp":
      extra({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "seeEnemyHp" }] });

      return out;
    case "spell_slots_lvl4_5":
      if (!passive) return (note("лише пасивкою"), out);

      if (!ctx.skipBakedStats && value) out.effects.push({ kind: "modifyStat", stat: "spellSlots", spellLevels: [4, 5], flat: value });

      return out;
  }

  if (PASSIVE_BAKED[e.stat]) {
    const stat = PASSIVE_BAKED[e.stat];

    const isTargets = stat === "minTargets" || stat === "maxTargets";

    if (ctx.skipBakedStats) return out;

    if (flat === null) return (note("нечислове значення"), out);

    if (isTargets) {
      extra({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat, flat }] });

      return out;
    }

    if (passive) {
      out.effects.push({ kind: "modifyStat", stat, flat, ...target("self") } as Effect);

      return out;
    }

    if (stat === "maxHp") {
      out.effects.push({ kind: "heal", amount: typeof flat === "number" ? Math.max(0, flat) : flat, ...target("self") });
      out.issues.push({ severity: "behavior", message: "hp_bonus у подійному тригері тепер лікує" });

      return out;
    }

    return (note("змінюється лише пасивкою"), out);
  }

  switch (e.stat) {
    case "armor":
    case "initiative": {
      if (flat === null) return (note("нечислове значення"), out);

      if (passive && e.stat === "initiative" && ctx.skipBakedStats) return out;

      const fallback: AbilityTarget = isHitAttacker ? "eventTarget" : trigger.event === "battleStart" && e.stat === "initiative" ? "allAllies" : "self";

      const rounds = trigger.event === "battleStart" && e.stat === "initiative" ? 99 : isHitAttacker ? (e.stat === "initiative" ? 2 : 1) : 1;

      out.effects.push({ kind: "modifyStat", stat: e.stat, flat, ...target(fallback), ...timing(rounds) } as Effect);

      return out;
    }
    case "armor_reduction":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "modifyStat", stat: "armor", percent: -Math.abs(value), ...target("eventTarget"), ...timing(1) } as Effect);

      return out;
    case "morale":
      if (passive) {
        if (e.type === "min") return (note("мінімальна мораль не автоматизована"), out);

        if (!ctx.skipBakedStats && value) out.effects.push({ kind: "modifyStat", stat: "morale", flat: value });

        return out;
      }

      if (value) out.effects.push({ kind: "changeMorale", delta: Math.trunc(value), ...target(trigger.event === "bonusAction" ? "eventTarget" : "self") });

      return out;
    case "morale_restore":
      if (value) out.effects.push({ kind: "changeMorale", delta: Math.trunc(value), target: "allEnemies" });

      return out;
    case "physical_resistance":
    case "spell_resistance":
    case "all_resistance": {
      if (!value) return (note("нечислове значення"), out);

      const types = e.stat === "all_resistance" ? ["physical", "spell"] : [e.stat.replace("_resistance", "")];

      for (const damageType of types) {
        out.effects.push({ kind: "flag", flag: "resistance", damageType, percent: Math.min(100, value), ...target("self"), ...timing(1) } as Effect);
      }

      return out;
    }
    case "crit_threshold":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "modifyStat", stat: "critThreshold", flat: value >= 10 ? value - 20 : -Math.abs(value), ...timing(1) } as Effect);

      return out;
    case "advantage":
    case "advantage_ranged":
      out.effects.push({ kind: "flag", flag: "advantage", attackKind: e.stat === "advantage" ? "all" : "ranged", ...target(trigger.event === "battleStart" ? "allAllies" : "self"), ...timing(1) } as Effect);

      return out;
    case "enemy_attack_disadvantage":
      out.effects.push({ kind: "flag", flag: "disadvantageForAttackers", ...timing(1) } as Effect);
      out.issues.push({ severity: "behavior", message: "enemy_attack_disadvantage тепер діє" });

      return out;
    case "guaranteed_hit":
      out.effects.push({ kind: "flag", flag: "guaranteedHit", ...timing(1) } as Effect);
      out.issues.push({ severity: "behavior", message: "guaranteed_hit тепер діє" });

      return out;
    case "field_damage":
      if (flat === null) return (note("нечислове значення"), out);

      out.effects.push({ kind: "dot", damagePerRound: typeof flat === "number" ? Math.max(0, flat) : flat, damageType: "fire", duration: { rounds: 3 }, target: "allEnemies" });

      return out;
    case "revive_hp":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "heal", revive: true, amount: e.isPercentage ? { percentOf: "maxHp", value } : value, target: "eventTarget" });

      return out;
    case "runic_attack":
      out.effects.push({
        kind: "randomOf",
        options: [
          { kind: "modifyStat", stat: "initiative", flat: 1, duration: { rounds: 1 } },
          { kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } },
          { kind: "heal", amount: 10 },
          { kind: "changeMorale", delta: 1 },
        ],
      });

      return out;
    case "blood_sacrifice_heal":
      out.effects.push({ kind: "heal", amount: { percentOf: "eventDamage", value: e.isPercentage && value ? value : (value ?? 50) } });

      return out;
    case "clear_negative_effects":
      out.effects.push({ kind: "cleanse", target: "eventTarget" });

      return out;
    case "restore_spell_slot":
      out.effects.push({ kind: "restoreSpellSlot", count: Math.max(1, Math.trunc(value ?? 1)) });

      return out;
    case "extra_casts":
      out.effects.push({ kind: "grantAction", refreshAction: true });

      return out;
    case "actions":
      if (value && value > 0) out.effects.push({ kind: "grantAction", extraActions: Math.trunc(value) });

      return out;
    case "survive_lethal":
      out.effects.push({ kind: "heal", amount: 1, revive: true });

      return out;
  }

  if (NOT_AUTOMATED.has(e.stat)) return (note("не автоматизовано"), out);

  note("невідомий стат");

  return out;
}
