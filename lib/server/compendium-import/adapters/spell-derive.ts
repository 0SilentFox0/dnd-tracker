/* eslint-disable no-restricted-syntax -- derived content written to the DB stays Ukrainian (spec part5, decision 5) */
import { withTargetFilter } from "./spell-patterns/target-filter";
import { lineTerrainEffect } from "./spell-patterns/zone-terrain";
import { array, str } from "./shared";
import type { SpellCast } from "./spell-cast";
import { createsPlainObject, isOutOfCombatBuff, type NarrativeReason, withoutObjectConditions, withoutRestOrTravel } from "./spell-narrative";
import { recognizeSpell } from "./spell-patterns";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { ErrorParams } from "@/lib/constants/api-errors";
import type { Effect } from "@/lib/utils/abilities/schema/effects";
import { CONDITION_5E_KEYS, isCustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import { ADDS_MOD, durationRounds, spellEffects, type SpellFacts, spellKind, spellRange, spellResolution, spellSide, spellTargeting, spellUpcast, validDice } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";

export type SpellBlocker = "SUMMON" | "BUFF_OR_TRANSFORM" | "WEAPON" | "VARIABLE_DAMAGE" | "SELF_DAMAGE" | "ZONE_OR_TRIGGER" | "UNSUPPORTED_CONDITION" | "UNMODELED_EFFECT";

export interface DerivedSpell {
  fields: Record<string, unknown>;
  narrative: boolean;
  narrativeReason?: NarrativeReason;
  riders: string[];
  refs?: Array<{ path: (string | number)[]; kind: string; name: string; source: string }>;
}

export type SpellDerivation = { native: DerivedSpell } | { blocker: SpellBlocker; detail?: ErrorParams };

const SIGNAL_TEXT = /\bhit points\b|\bspeed\b[^.]{0,30}\b(?:reduced|increases?|decreases?|at least)\b|\b(?:reduces?|increases?)\b[^.]{0,30}\bspeed\b|\bArmor Class\b|\badvantage\b|\bdisadvantage\b|\bspell attack\b|\bsaving throw\b/i;

const WEAPON = /\bweapon attacks?\b|\bammunition\b|\b(?:simple or martial|simple|martial) weapons?\b|\bweapons? of your choice\b|\bas a (?:melee |ranged )?weapon\b/i;

const BUFF = /\b(?:your|its) Armor Class becomes\b|\btransforms?\b|\bnew (?:humanoid )?form\b/i;

const SLOWED = /\bspeed is reduced by (\d+) feet/i;

const REST = /\b(?:short|long) rest\b/i;

const CHOICE = /\bone of the following\b|\bchoose one\b/i;

const SPEED_UP = /\bspeed increases by (\d+) feet/i;

const MOVE_TRIGGER = /(?:,? and )?\bwhenever\b[^.]*\bmove up to\b[^.]*\./gi;

const IMMOBILIZING = /\bcan move only by\b|\bgrows around\b[^.]*\bcreatures?\b/i;

const SELF_AND_OTHERS = /\byou and up to (\w+) (?:other |willing )+creatures\b/i;

const LEADING_COUNT = /^(\w+) creatures\b/i;

const ZONE = /\b(?:(?:at )?the (?:start|end) of (?:each|every|your turn|its turn|their turn)\b|whenever\b|for the first time on a turn|starts its turn|use your reaction|(?:each|every) turn|when a creature (?:enters|moves))/i;

const SELF_DAMAGE = /\byou (?:take|suffer) (?:\d+d\d+|\d+) \w+ damage/i;

const VARIABLE = /\b\d+-\d+ feet:|\b(?:for (?:every|each)|per) \d+ feet\b/i;

const DEALS = /\bdeal(?:s|ing)\b[^.]{0,40}damage/i;

const SELF_CONDITION = /\byou (?:\w+ )?(?:become|remain)s? (?:\w+ )?\{@condition (\w+)/i;

const TARGET_CONDITION = /\b(?:target|creature|it)\b[^.{]{0,40}\b(?:is|becomes?)\s+(?:magically\s+)?\{@condition (\w+)/i;

const UP_TO_CREATURES = /\bup to (\w+) (?:other |willing |hostile |(?:tiny|small|medium|large|huge|gargantuan)(?: or (?:smaller|larger))? )*creatures\b/i;

const SHAPE_TEXT = /(\d+)-foot(?:-radius)?(?:, \d+-foot-(?:high|tall))? (sphere|cube|cone|cylinder)\b|(\d+)-foot-long[^.]{0,20}\bline\b|(\d+)-foot line\b|\bline up to (\d+) feet long/i;

const PUSH = /\bpushed (?:up to )?(\d+) feet (?:away )?from you\b/i;

const RIDERS: Array<[RegExp, string]> = [
  [/\bpush(?:ed)?\b|\bpull(?:ed)?\b|\bknock(?:ed)?\b|carried along/i, "поштовх/притягання"],
  [/difficult terrain/i, "складна місцевість"],
  [/vulnerab|resistan|immun/i, "вразливість/опір/імунітет"],
  [/\bspeed\b/i, "швидкість"],
  [CHOICE, "вибір варіанта"],
];

const EXTRA_FILTERED_TARGETS = /\bone additional humanoid\b/i;

const REPEAT_SAVING_THROW = /\brepeat the saving throw\b/i;

const withSaveEnds = (effects: Effect[], ability: AbilityKey | null, text: string, applied: string | null): Effect[] =>
  isCustomConditionKey(applied) && ability && REPEAT_SAVING_THROW.test(text) ? effects.map((e) => (e.kind === "applyCondition" && !e.saveEnds ? { ...e, saveEnds: { ability } } : e)) : effects;

const tags = (raw: string, name: string): string[] => [...new Set([...raw.matchAll(new RegExp(`\\{@${name} ([^}|]*)`, "g"))].map((m) => m[1].trim()))];

const strings = (v: unknown): string[] => array(v).map(str).filter(Boolean);

const isCondition = (c: string): c is (typeof CONDITION_5E_KEYS)[number] => (CONDITION_5E_KEYS as readonly string[]).includes(c);

type CustomKeys = ReadonlyMap<string, string>;

type DerivedCondition = NonNullable<SpellFacts["condition"]>;

const resolveCondition = (c: string, custom: CustomKeys): DerivedCondition | null => (isCondition(c) ? c : ((custom.get(c) as DerivedCondition | undefined) ?? null));

function conditionOf(row: Record<string, unknown>, raw: string, text: string, hasSave: boolean, custom: CustomKeys): { condition: DerivedCondition | null; beneficial: boolean } {
  const inflicted = strings(row.conditionInflict).map((c) => c.toLowerCase());

  const only = inflicted.length === 1 ? resolveCondition(inflicted[0], custom) : null;

  if (only) return { condition: only, beneficial: false };

  const self = SELF_CONDITION.exec(raw)?.[1]?.toLowerCase();

  const selfCondition = self ? resolveCondition(self, custom) : null;

  if (selfCondition) return { condition: selfCondition, beneficial: true };

  if (hasSave && IMMOBILIZING.test(text)) return { condition: "immobilized", beneficial: false };

  const target = hasSave ? TARGET_CONDITION.exec(raw)?.[1]?.toLowerCase() : undefined;

  return { condition: target ? resolveCondition(target, custom) : null, beneficial: false };
}

function shape(text: string, cast: SpellCast): Pick<SpellFacts, "shape_type" | "shape_size"> {
  if (cast.facts.shape_type) return { shape_type: cast.facts.shape_type, shape_size: cast.facts.shape_size };

  const m = SHAPE_TEXT.exec(text);

  if (!m) return { shape_type: null, shape_size: null };

  if (m[2]) return { shape_type: m[2].toLowerCase() === "cylinder" ? "sphere" : m[2].toLowerCase(), shape_size: Number(m[1]) };

  return { shape_type: "line", shape_size: Number(m[3] ?? m[4] ?? m[5]) };
}

interface SpellInput {
  row: Record<string, unknown>;
  text: string;
  higher: string;
  cast: SpellCast;
  raw: string;
  misc: string[];
  damageTypes: string[];
  ability: string | null;
  spellAttack: boolean;
  moveTrigger: boolean;
  triggerText: string;
  unknownConditions: string[];
  signals: boolean;
  rowCombat: boolean;
  customConditions: CustomKeys;
}

const RESIST_KEYS = ["damageImmune", "damageResist", "damageVulnerable"];

const hasAny = (row: Record<string, unknown>, keys: string[]) => keys.some((k) => array(row[k]).length > 0);

function readSpellInput(row: Record<string, unknown>, text: string, higher: string, cast: SpellCast, customConditions: CustomKeys): SpellInput {
  const raw = JSON.stringify(row.entries ?? []);

  const damageTypes = strings(row.damageInflict);

  const ability = strings(row.savingThrow).find((a) => (ABILITY_KEYS as readonly string[]).includes(a)) ?? null;

  const spellAttack = array(row.spellAttack).length > 0;

  let moveTrigger = false;

  const triggerText = text.replace(/[^.]*repeat the saving throw[^.]*\./gi, "").replace(MOVE_TRIGGER, (clause) => {
    if (/damage|saving throw|\bcondition\b/i.test(clause)) return clause;

    moveTrigger = true;

    return "";
  });

  const unknownConditions = [...tags(raw, "condition"), ...strings(row.conditionInflict)].map((c) => c.toLowerCase()).filter((c) => !resolveCondition(c, customConditions));

  const signals = damageTypes.length > 0 || ability !== null || spellAttack || strings(row.conditionInflict).length > 0 || hasAny(row, [...RESIST_KEYS, "conditionImmune"]) || tags(raw, "damage").length > 0 || tags(raw, "condition").length > 0 || SIGNAL_TEXT.test(text);

  const rowCombat = damageTypes.length > 0 || spellAttack || strings(row.conditionInflict).length > 0 || hasAny(row, [...RESIST_KEYS, "conditionImmune"]);

  return { row, text, higher, cast, raw, misc: strings(row.miscTags), damageTypes, ability, spellAttack, moveTrigger, triggerText, unknownConditions, signals, rowCombat, customConditions };
}

const narrative = (narrativeReason: NarrativeReason): SpellDerivation => ({ native: { fields: { targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: [] }, narrative: true, narrativeReason, riders: [] } });

/** Narrative and blocker outcomes decided from the row and text alone, in priority order. */
function screenSpell(i: SpellInput): SpellDerivation | undefined {
  const { row, text, higher, cast, raw, misc, damageTypes, ability, signals, rowCombat } = i;

  const hasSignals = (t: string, r: string) => rowCombat || ability !== null || tags(r, "damage").length > 0 || tags(r, "condition").length > 0 || SIGNAL_TEXT.test(t);

  if (!rowCombat && isOutOfCombatBuff(cast, text)) return narrative("outOfCombat");

  if (signals && !hasSignals(withoutRestOrTravel(text), raw)) return narrative("outOfCombat");

  if (signals && !hasSignals(text, withoutObjectConditions(raw))) return narrative("objectOnly");

  if (!signals && createsPlainObject(misc, text, raw)) return narrative("createdObject");

  const recognized = recognizeSpell({ row, raw, text, higher, cast, ability: ability as AbilityKey | null, damageTypes });

  if (recognized) return recognized;

  if (misc.includes("SMN")) return { blocker: "SUMMON" };

  if (BUFF.test(text) || hasAny(row, RESIST_KEYS)) return { blocker: "BUFF_OR_TRANSFORM" };

  if (signals && ZONE.test(i.triggerText)) return { blocker: "ZONE_OR_TRIGGER" };

  if (WEAPON.test(text)) return { blocker: "WEAPON" };

  if (!signals) return narrative("noCombatNumbers");

  if (i.unknownConditions.length > 0) return { blocker: "UNSUPPORTED_CONDITION", detail: { condition: i.unknownConditions[0] } };

  if (SELF_DAMAGE.test(text)) return { blocker: "SELF_DAMAGE" };

  return undefined;
}

function slowedSpell(i: SpellInput): SpellDerivation | undefined {
  const { text, cast } = i;

  const slowed = SLOWED.exec(text);

  if (!slowed || i.damageTypes.length > 0 || i.ability || i.spellAttack) return undefined;

  const range = spellRange(cast.facts);

  return { native: { narrative: false, riders: [], fields: { targeting: { kind: "enemy", ...(range !== "self" && { range }) }, resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: -Number(slowed[1]), duration: { rounds: durationRounds(cast.facts.duration) } }] } } };
}

function speedUpSpell(i: SpellInput): SpellDerivation | undefined {
  const { row, text, higher, cast } = i;

  const sped = SPEED_UP.exec(text);

  if (!sped || i.damageTypes.length > 0 || i.ability || i.spellAttack || CHOICE.test(text)) return undefined;

  const withSelf = SELF_AND_OTHERS.exec(text);

  const upTo = UP_TO_CREATURES.exec(text);

  const count = withSelf ? (numberWord(withSelf[1]) ?? 0) + 1 : upTo ? numberWord(upTo[1]) : null;

  const facts: SpellFacts = { level: row.level as number, desc: text, higher_level: higher || null, ...cast.facts, shape_type: null, shape_size: null, saving_throw_ability: null, damage_roll: null, damage_types: [], target_count: count };

  const riders = RIDERS.filter(([re, label]) => label !== "швидкість" && re.test(text)).map(([, label]) => label);

  if (i.moveTrigger) riders.push("рух за реакцією");

  return { native: { narrative: false, riders, fields: { targeting: spellTargeting(facts, "ally"), resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: Number(sped[1]), duration: { rounds: durationRounds(cast.facts.duration) } }], ...spellUpcast(facts, "none") } } };
}

function damageOrConditionSpell(i: SpellInput): SpellDerivation {
  const { row, text, higher, cast, raw, damageTypes, ability, spellAttack, customConditions } = i;

  const damageDice = tags(raw, "damage");

  const diceTags = tags(raw, "dice");

  const roll = REST.test(text) && damageTypes.length === 0 ? null : damageDice.length === 1 ? damageDice[0] : damageDice.length === 0 && diceTags.length === 1 ? diceTags[0] : null;

  if (VARIABLE.test(text) || (damageTypes.length > 0 && damageDice.length > 1)) return { blocker: "VARIABLE_DAMAGE" };

  const { condition, beneficial } = conditionOf(row, raw, text, ability !== null, customConditions);

  const upTo = UP_TO_CREATURES.exec(text);

  const facts: SpellFacts = { level: row.level as number, desc: text, higher_level: higher || null, ...cast.facts, duration: condition === "immobilized" && cast.facts.duration === "instantaneous" ? "until dispelled" : cast.facts.duration, ...shape(text, cast), saving_throw_ability: ability, damage_roll: roll, damage_types: damageTypes, target_count: upTo ? numberWord(upTo[1]) : numberWord(LEADING_COUNT.exec(text)?.[1] ?? ""), spellAttack, immediateDamage: DEALS.test(text), condition, beneficial };

  const kind = spellKind(facts);

  if (kind === "none") {
    return { blocker: "UNMODELED_EFFECT", detail: { save: ability ?? "none", attack: spellAttack ? "yes" : "no", damage: damageTypes.length > 0 ? "yes" : "no" } };
  }

  const side = spellSide(facts, kind);

  const targeting = spellTargeting(facts, side, kind);

  const dice = kind === "damage" || kind === "heal" ? validDice(facts) : null;

  const applied = kind === "condition" ? condition : null;

  const pushed = PUSH.exec(text);

  const pushFeet = pushed ? Number(pushed[1]) : 0;

  const push = pushFeet >= 5 && pushFeet <= 30 && pushFeet % 5 === 0 && (kind === "damage" || kind === "condition") ? pushFeet : 0;

  const lineTerrain = lineTerrainEffect(text, spellRange(cast.facts));

  const riders = RIDERS.filter(([re, label]) => re.test(text) && !(push && label === "поштовх/притягання") && !(lineTerrain && label === "складна місцевість")).map(([, label]) => label);

  if (applied === "immobilized") riders.push("утримання цілей: умови й переміщення (див. опис)");

  const otherConditions = tags(raw, "condition").filter((c) => c.toLowerCase() !== applied && customConditions.get(c.toLowerCase()) !== applied);

  if (otherConditions.length > 0) riders.push(`стани: ${otherConditions.join(", ")}`);

  return {
    native: {
      narrative: false,
      riders,
      fields: {
        targeting: withTargetFilter(targeting, text, higher),
        resolution: spellResolution(facts, kind, targeting),
        spellEffects: [...withSaveEnds(spellEffects(facts, kind), ability as AbilityKey | null, text, applied), ...(push ? [{ kind: "push", feet: push, from: "caster" }] : []), ...(lineTerrain ? [lineTerrain] : [])],
        dice: dice?.count ?? 0,
        ...(dice && { dieSides: dice.sides }),
        ...spellUpcast(facts, kind),
        ...(isCustomConditionKey(applied) && EXTRA_FILTERED_TARGETS.test(higher) && { upcastTargets: 1 }),
        ...(kind === "heal" && ADDS_MOD.test(text) && { addAbilityMod: true }),
      },
    },
  };
}

export function deriveSpell(row: Record<string, unknown>, text: string, higher: string, cast: SpellCast, customConditions: CustomKeys = new Map()): SpellDerivation {
  const input = readSpellInput(row, text, higher, cast, customConditions);

  return screenSpell(input) ?? slowedSpell(input) ?? speedUpSpell(input) ?? damageOrConditionSpell(input);
}
