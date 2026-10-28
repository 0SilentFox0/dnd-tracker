import { type Fixture, type O5CastingOption, type O5Spell, type Open5eData } from "../lib/open5e";
import { bySlug, clamp, numberWord, parseDiceExpr, titleCase } from "../lib/text";
import type { SpellRow } from "../lib/types";
import { SPELL_OVERRIDES } from "../overrides/spells";
import { schoolName } from "./spell-groups";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Effect } from "@/lib/utils/abilities/schema";
import { groupBy } from "@/lib/utils/common/collections";
import { capitalize } from "@/lib/utils/common/text";
import type { SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

type Side = "ally" | "enemy";

type Kind = "heal" | "damage" | "condition" | "none";

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

const ADDS_MOD = /plus your spellcasting ability modifier/i;

const SHAPES: Record<string, "circle" | "cube" | "cone" | "line"> = { sphere: "circle", cube: "cube", cone: "cone", line: "line" };

const CASTING_TIME: Record<string, string> = { action: "Action", "bonus-action": "Bonus Action", reaction: "Reaction", "1minute": "1 minute", "10minutes": "10 minutes", "1hour": "1 hour" };

export function durationRounds(duration: string): number {
  const d = duration.trim().toLowerCase();

  const rounds = /^(\d+) rounds?$/.exec(d);

  if (rounds) return clamp(Number(rounds[1]), 1, 99);

  if (d === "1 minute") return 10;

  if (d === "instantaneous") return 1;

  return 99;
}

export function spellRange(f: O5Spell): number | "self" {
  if (f.range_text === "Self") return "self";

  if (f.range_text === "Touch") return 5;

  return f.range === null ? 600 : clamp(Math.round(f.range), 5, 600);
}

function validDice(f: O5Spell) {
  const dice = parseDiceExpr(f.damage_roll);

  return dice && DIE_SIDES.has(dice.sides) && dice.count >= 1 && dice.count <= 40 ? dice : null;
}

export function spellKind(f: O5Spell): Kind {
  const dice = validDice(f);

  if (dice && f.damage_types.length === 0 && HEALS.test(f.desc)) return "heal";

  if (dice && f.damage_types.length > 0 && (f.saving_throw_ability || SPELL_ATTACK.test(f.desc) || IMMEDIATE_DAMAGE.test(f.desc))) return "damage";

  if (f.saving_throw_ability && f.damage_types.length === 0 && CONDITION.test(f.desc)) return "condition";

  return "none";
}

const sideOf = (f: O5Spell, kind: Kind): Side => (kind === "heal" ? "ally" : kind !== "none" || f.saving_throw_ability || SPELL_ATTACK.test(f.desc) ? "enemy" : "ally");

function templateShape(f: O5Spell): { shape: "circle" | "cube" | "cone" | "line"; size: number } | null {
  const shape = f.shape_type ? SHAPES[f.shape_type] : undefined;

  if (shape) {
    const size = shape === "line" ? Number(LINE_LENGTH.exec(f.desc)?.[1] ?? f.shape_size ?? 5) : (f.shape_size ?? 5);

    return { shape, size: clamp(Math.round(size), 5, 120) };
  }

  const area = AREA.exec(f.desc);

  return area ? { shape: "circle", size: clamp(Number(area[1]), 5, 120) } : null;
}

const WITHIN = /\bwithin (\d+) feet/i;

export function spellTargeting(f: O5Spell, side: Side, kind: Kind = "none"): SpellTargeting {
  const range = spellRange(f);

  const template = templateShape(f);

  if (template) {
    const upTo = UP_TO.exec(f.desc);

    const maxTargets = upTo ? clamp(numberWord(upTo[1]) ?? 20, 1, 20) : 20;

    const centered = template.shape === "circle" || template.shape === "cube";

    const at = range === "self" ? (centered ? 5 : undefined) : range;

    return { kind: "template", shape: template.shape, size: template.size, side, maxTargets, ...(at !== undefined && { range: at }) };
  }

  if (range === "self") {
    if (kind !== "damage" && kind !== "condition") return { kind: "self" };

    // a self-range spell that harms someone acts on a target, not on the caster
    return { kind: "enemy", range: clamp(Number(WITHIN.exec(f.desc)?.[1] ?? 5), 5, 600) };
  }

  const count = f.target_count ?? 1;

  if (count > 1) return { kind: "area", side, maxTargets: clamp(count, 1, 20), range };

  return side === "ally" ? { kind: "ally", range } : { kind: "enemy", range };
}

function resolution(f: O5Spell, kind: Kind, targeting: SpellTargeting): SpellResolution {
  if (kind === "damage" && SPELL_ATTACK.test(f.desc) && (targeting.kind === "enemy" || targeting.kind === "area")) return { kind: "attack" };

  if (f.saving_throw_ability && (kind === "damage" || kind === "condition")) {
    return { kind: "save", ability: f.saving_throw_ability as AbilityKey, onSuccess: kind === "damage" && HALF.test(f.desc) ? "half" : "none" };
  }

  return { kind: "auto" };
}

function effects(f: O5Spell, kind: Kind): Effect[] {
  if (kind === "damage") return [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: f.damage_types[0] }];

  if (kind === "heal") return [{ kind: "heal", amount: { spellRoll: 100 } }];

  if (kind === "condition") {
    const condition = CONDITION.exec(f.desc)![1].toLowerCase() as Extract<Effect, { kind: "applyCondition" }>["condition"];

    const ability = f.saving_throw_ability as AbilityKey;

    return [{ kind: "applyCondition", condition, duration: { rounds: durationRounds(f.duration) }, ...(REPEATS_SAVE.test(f.desc) && { saveEnds: { ability } }) }];
  }

  return [];
}

function upcast(f: O5Spell, kind: Kind, options: Array<Fixture<O5CastingOption, number>>): Pick<SpellRow, "upcastDice" | "upcastTargets"> {
  if (f.level === 0) return {};

  const base = validDice(f);

  let upcastDice: number | undefined;

  if (base && (kind === "damage" || kind === "heal")) {
    const steps = options
      .filter((o) => o.fields.type.startsWith("slot_level_"))
      .map((o) => ({ level: Number(o.fields.type.slice("slot_level_".length)), dice: parseDiceExpr(o.fields.damage_roll) }))
      .filter((o): o is { level: number; dice: { count: number; sides: number } } => !!o.dice && o.dice.sides === base.sides)
      .sort((a, b) => a.level - b.level);

    if (steps.length > 0) {
      const per = (steps[0].dice.count - base.count) / (steps[0].level - f.level);

      if (Number.isInteger(per) && per > 0 && steps.every((s) => s.dice.count === base.count + per * (s.level - f.level))) upcastDice = per;
    }

    const text = upcastDice === undefined ? TEXT_UPCAST.exec(f.higher_level ?? "") : null;

    if (text && Number(text[2]) === base.sides) upcastDice = Number(text[1]);
  }

  return {
    ...(upcastDice !== undefined && { upcastDice: clamp(upcastDice, 0, 10) }),
    ...(EXTRA_TARGETS.test(f.higher_level ?? "") && { upcastTargets: 1 }),
  };
}

function description(f: O5Spell): string {
  const components = [f.verbal && "V", f.somatic && "S", f.material && `M${f.material_specified ? ` (${f.material_specified})` : ""}`].filter(Boolean).join(", ");

  const school = titleCase(f.school);

  const head = [
    f.level === 0 ? `${school} Cantrip` : `Level ${f.level} ${school}`,
    `Casting Time: ${CASTING_TIME[f.casting_time] ?? f.casting_time}${f.ritual ? " or Ritual" : ""}`,
    `Range: ${f.range_text}`,
    `Components: ${components || "—"}`,
    `Duration: ${f.concentration ? "Concentration, up to " : ""}${capitalize(f.duration)}`,
    `Classes: ${f.classes.map((c) => titleCase(c.replace(/^srd-2024_/, ""))).join(", ") || "—"}`,
  ].join(" · ");

  const higher = f.higher_level ? `${f.level === 0 ? "Cantrip Upgrade." : "Using a Higher-Level Spell Slot."} ${f.higher_level}` : null;

  return [head, f.desc.trim(), higher].filter(Boolean).join("\n\n");
}

export function convertSpell(row: Fixture<O5Spell>, options: Array<Fixture<O5CastingOption, number>>): SpellRow {
  const f = row.fields;

  const kind = spellKind(f);

  const targeting = spellTargeting(f, sideOf(f, kind), kind);

  const dice = kind === "damage" || kind === "heal" ? validDice(f) : null;

  const base: SpellRow = {
    slug: row.pk,
    name: f.name,
    level: f.level,
    groupId: schoolName(f.school),
    description: description(f),
    cost: f.casting_time === "bonus-action" ? "bonusAction" : "action",
    dice: dice?.count ?? 0,
    ...(dice && { dieSides: dice.sides as SpellRow["dieSides"] }),
    concentration: f.concentration,
    ...upcast(f, kind, options),
    ...(kind === "heal" && ADDS_MOD.test(f.desc) && { addAbilityMod: true }),
    targeting,
    resolution: resolution(f, kind, targeting),
    spellEffects: effects(f, kind),
  };

  return { ...base, ...SPELL_OVERRIDES[row.pk] };
}

export function convertSpells(data: Open5eData): SpellRow[] {
  const options = groupBy(data.castingOptions, (o) => o.fields.parent);

  return data.spells.map((s) => convertSpell(s, options.get(s.pk) ?? [])).sort(bySlug);
}
