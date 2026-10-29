import { numberWord, parseDiceExpr } from "./text";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Effect } from "@/lib/utils/abilities/schema";
import { clamp } from "@/lib/utils/common/clamp";
import type { SpellCastingTime, SpellCost, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export type SpellSide = "ally" | "enemy";

export type SpellKind = "heal" | "damage" | "condition" | "none";

type ConditionEffect = Extract<Effect, { kind: "applyCondition" }>;

// field names follow Open5e so the SRD converter can pass its rows as-is
export interface SpellFacts {
  level: number;
  desc: string;
  higher_level: string | null;
  range_text: string;
  range: number | null;
  saving_throw_ability: string | null;
  damage_roll: string | null;
  damage_types: string[];
  duration: string;
  shape_type: string | null;
  shape_size: number | null;
  target_count: number | null;
  spellAttack?: boolean;
  immediateDamage?: boolean;
  condition?: ConditionEffect["condition"] | null;
  beneficial?: boolean;
}

const DIE_SIDES = new Set([4, 6, 8, 10, 12]);

const SPELL_ATTACK = /\bmakes? (?:a|one) (?:ranged|melee) spell attack/i;

const IMMEDIATE_DAMAGE = /\btak(?:e|es|ing) (?:\d+d\d+|\d+)(?: \+ \d+)? \w+ damage/i;

const HEALS = /\bregains? (?:a number of )?Hit Points|\bregain Hit Points/i;

const HALF = /half as much|half damage/i;

const CONDITION = /\b(?:has|have|gains?) the (Blinded|Charmed|Deafened|Frightened|Grappled|Incapacitated|Invisible|Paralyzed|Petrified|Poisoned|Prone|Restrained|Stunned|Unconscious) condition/i;

const REPEATS_SAVE = /\brepeats? the save/i;

const AREA = /\b(\d+)-foot(?:-radius)?(?:, \d+-foot-(?:high|tall))? (Emanation|Sphere|Cylinder)\b/;

const LINE_LENGTH = /\b(\d+)-foot-long\b/;

const UP_TO = /\bup to (one|two|three|four|five|six|seven|eight|nine|ten|\d+) creatures\b/i;

const TEXT_UPCAST = /\b(?:damage|healing) increases by (\d+)d(\d+) for each (?:spell )?slot level above/i;

const EXTRA_TARGETS = /\b(?:one additional creature|target one additional|one additional target)\b/i;

const WITHIN = /\bwithin (\d+) feet/i;

export const ADDS_MOD = /plus your spellcasting ability modifier/i;

const SHAPES: Record<string, "circle" | "cube" | "cone" | "line"> = { sphere: "circle", cube: "cube", cone: "cone", line: "line" };

export function durationRounds(duration: string): number {
  const d = duration.trim().toLowerCase();

  const rounds = /^(\d+) rounds?$/.exec(d);

  if (rounds) return clamp(Number(rounds[1]), 1, 99);

  if (d === "1 minute") return 10;

  if (d === "instantaneous") return 1;

  return 99;
}

export function spellRange(f: Pick<SpellFacts, "range_text" | "range">): number | "self" {
  if (f.range_text === "Self") return "self";

  if (f.range_text === "Touch") return 5;

  return f.range === null ? 600 : clamp(Math.round(f.range), 5, 600);
}

export function validDice(f: Pick<SpellFacts, "damage_roll">) {
  const dice = parseDiceExpr(f.damage_roll);

  return dice && DIE_SIDES.has(dice.sides) && dice.count >= 1 && dice.count <= 40 ? dice : null;
}

const isAttack = (f: SpellFacts) => f.spellAttack ?? SPELL_ATTACK.test(f.desc);

export const spellCondition = (f: SpellFacts): ConditionEffect["condition"] | null => f.condition ?? (CONDITION.exec(f.desc)?.[1].toLowerCase() as ConditionEffect["condition"] | undefined) ?? null;

export function spellKind(f: SpellFacts): SpellKind {
  const dice = validDice(f);

  if (dice && f.damage_types.length === 0 && HEALS.test(f.desc)) return "heal";

  if (dice && f.damage_types.length > 0 && (f.saving_throw_ability || isAttack(f) || (f.immediateDamage ?? IMMEDIATE_DAMAGE.test(f.desc)))) return "damage";

  if ((f.saving_throw_ability || (f.condition && (isAttack(f) || f.beneficial))) && f.damage_types.length === 0 && spellCondition(f)) return "condition";

  return "none";
}

export const spellSide = (f: SpellFacts, kind: SpellKind): SpellSide => (kind === "heal" || f.beneficial ? "ally" : kind !== "none" || f.saving_throw_ability || isAttack(f) ? "enemy" : "ally");

function templateShape(f: SpellFacts): { shape: "circle" | "cube" | "cone" | "line" | "emanation"; size: number } | null {
  const area = AREA.exec(f.desc);

  if (area?.[2] === "Emanation") return { shape: "emanation", size: clamp(Number(area[1]), 5, 120) };

  const shape = f.shape_type ? SHAPES[f.shape_type] : undefined;

  if (shape) {
    const size = shape === "line" ? Number(LINE_LENGTH.exec(f.desc)?.[1] ?? f.shape_size ?? 5) : (f.shape_size ?? 5);

    return { shape, size: clamp(Math.round(size), 5, 120) };
  }

  return area ? { shape: "circle", size: clamp(Number(area[1]), 5, 120) } : null;
}

export function spellTargeting(f: SpellFacts, side: SpellSide, kind: SpellKind = "none"): SpellTargeting {
  const range = spellRange(f);

  const template = templateShape(f);

  if (template) {
    const upTo = UP_TO.exec(f.desc);

    const maxTargets = upTo ? clamp(numberWord(upTo[1]) ?? 20, 1, 20) : 20;

    const centered = template.shape === "circle" || template.shape === "cube";

    const at = template.shape === "emanation" ? undefined : range === "self" ? (centered ? 5 : undefined) : range;

    return { kind: "template", shape: template.shape, size: template.size, side, maxTargets, ...(template.shape === "circle" && { exact: true }), ...(at !== undefined && { range: at }) };
  }

  if (range === "self") {
    if ((kind !== "damage" && kind !== "condition") || f.beneficial) return { kind: "self" };

    // a self-range spell that harms someone acts on a target, not on the caster
    return { kind: "enemy", range: clamp(Number(WITHIN.exec(f.desc)?.[1] ?? 5), 5, 600) };
  }

  const count = f.target_count ?? 1;

  if (count > 1) return { kind: "area", side, maxTargets: clamp(count, 1, 20), range };

  return side === "ally" ? { kind: "ally", range } : { kind: "enemy", range };
}

export function spellResolution(f: SpellFacts, kind: SpellKind, targeting: SpellTargeting): SpellResolution {
  const attackable = targeting.kind === "enemy" || targeting.kind === "area";

  if (kind === "damage" && isAttack(f) && attackable) return { kind: "attack" };

  if (f.saving_throw_ability && (kind === "damage" || kind === "condition")) {
    return { kind: "save", ability: f.saving_throw_ability as AbilityKey, onSuccess: kind === "damage" && HALF.test(f.desc) ? "half" : "none" };
  }

  if (kind === "condition" && isAttack(f) && attackable) return { kind: "attack" };

  return { kind: "auto" };
}

export function spellEffects(f: SpellFacts, kind: SpellKind): Effect[] {
  if (kind === "damage") return [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: f.damage_types[0] }];

  if (kind === "heal") return [{ kind: "heal", amount: { spellRoll: 100 } }];

  const condition = kind === "condition" ? spellCondition(f) : null;

  if (condition) {
    const ability = f.saving_throw_ability as AbilityKey | null;

    return [{ kind: "applyCondition", condition, duration: { rounds: durationRounds(f.duration) }, ...(ability && REPEATS_SAVE.test(f.desc) && { saveEnds: { ability } }) }];
  }

  return [];
}

export interface UpcastStep { level: number; dice: { count: number; sides: number } | null }

export function spellUpcast(f: SpellFacts, kind: SpellKind, steps: UpcastStep[] = []): { upcastDice?: number; upcastTargets?: number } {
  if (f.level === 0) return {};

  const base = validDice(f);

  let upcastDice: number | undefined;

  if (base && (kind === "damage" || kind === "heal")) {
    const sorted = steps.filter((o): o is { level: number; dice: { count: number; sides: number } } => !!o.dice && o.dice.sides === base.sides).sort((a, b) => a.level - b.level);

    if (sorted.length > 0) {
      const per = (sorted[0].dice.count - base.count) / (sorted[0].level - f.level);

      if (Number.isInteger(per) && per > 0 && sorted.every((s) => s.dice.count === base.count + per * (s.level - f.level))) upcastDice = per;
    }

    const text = upcastDice === undefined ? TEXT_UPCAST.exec(f.higher_level ?? "") : null;

    if (text && Number(text[2]) === base.sides) upcastDice = Number(text[1]);
  }

  return {
    ...(upcastDice !== undefined && { upcastDice: clamp(upcastDice, 0, 10) }),
    ...(EXTRA_TARGETS.test(f.higher_level ?? "") && { upcastTargets: 1 }),
  };
}

const LONG_CASTING = /^(\d+)(minutes?|hours?)$/;

// key: "action" | "bonus-action" | "reaction" | "10minutes" | "1hour"
export function castingFields(key: string, trigger?: string | null): { cost: SpellCost; casting: SpellCastingTime } {
  const long = LONG_CASTING.test(key);

  const cost: SpellCost = key === "bonus-action" ? "bonusAction" : key === "reaction" ? "reaction" : long ? "long" : "action";

  if (key === "reaction") return { cost, casting: { ...(trigger && { trigger }), text: "reaction" } };

  if (long) return { cost, casting: { rounds: Number.parseInt(key) * (key.includes("hour") ? 600 : 10), text: key } };

  return { cost, casting: { text: key } };
}

export interface SpellHead { level: number; school: string; casting: string; ritual: boolean; range: string; components: string; duration: string; concentration: boolean; classes: string[] }

export function spellHead(h: SpellHead): string {
  return [
    h.level === 0 ? `${h.school} Cantrip` : `Level ${h.level} ${h.school}`,
    `Casting Time: ${h.casting}${h.ritual ? " or Ritual" : ""}`,
    `Range: ${h.range}`,
    `Components: ${h.components || "—"}`,
    `Duration: ${h.concentration ? "Concentration, up to " : ""}${h.duration}`,
    `Classes: ${h.classes.join(", ") || "—"}`,
  ].join(" · ");
}
