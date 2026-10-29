import { array, str } from "./shared";
import type { SpellCast } from "./spell-cast";
import { createsPlainObject, isOutOfCombatBuff, type NarrativeReason, withoutObjectConditions, withoutRestOrTravel } from "./spell-narrative";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import type { ErrorParams } from "@/lib/constants/api-errors";
import type { Translator } from "@/lib/i18n/translator";
import { type AnyConditionKey, CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { ADDS_MOD, durationRounds, spellEffects, type SpellFacts, spellKind, spellRange, spellResolution, spellSide, spellTargeting, spellUpcast, validDice } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";

export type SpellBlocker = "SUMMON" | "BUFF_OR_TRANSFORM" | "WEAPON" | "VARIABLE_DAMAGE" | "SELF_DAMAGE" | "ZONE_OR_TRIGGER" | "UNSUPPORTED_CONDITION" | "UNMODELED_EFFECT";

export interface DerivedSpell {
  fields: Record<string, unknown>;
  narrative: boolean;
  narrativeReason?: NarrativeReason;
  riders: string[];
}

export type SpellDerivation = { native: DerivedSpell } | { blocker: SpellBlocker; detail?: ErrorParams };

const SIGNAL_TEXT = /\bhit points\b|\bspeed\b[^.]{0,30}\b(?:reduced|increases?|decreases?)\b|\b(?:reduces?|increases?)\b[^.]{0,30}\bspeed\b|\bArmor Class\b|\badvantage\b|\bdisadvantage\b|\bspell attack\b|\bsaving throw\b/i;

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

const RIDERS: Array<[RegExp, "push" | "terrain" | "vulnerability" | "speed" | "choice"]> = [
  [/\bpush(?:ed)?\b|\bpull(?:ed)?\b|\bknock(?:ed)?\b|carried along/i, "push"],
  [/difficult terrain/i, "terrain"],
  [/vulnerab|resistan|immun/i, "vulnerability"],
  [/\bspeed\b/i, "speed"],
  [CHOICE, "choice"],
];

const tags = (raw: string, name: string): string[] => [...new Set([...raw.matchAll(new RegExp(`\\{@${name} ([^}|]*)`, "g"))].map((m) => m[1].trim()))];

const strings = (v: unknown): string[] => array(v).map(str).filter(Boolean);

const isCondition = (c: string): c is (typeof CONDITION_5E_KEYS)[number] => (CONDITION_5E_KEYS as readonly string[]).includes(c);

function conditionOf(row: Record<string, unknown>, raw: string, text: string, hasSave: boolean): { condition: AnyConditionKey | null; beneficial: boolean } {
  const inflicted = strings(row.conditionInflict).map((c) => c.toLowerCase());

  if (inflicted.length === 1 && isCondition(inflicted[0])) return { condition: inflicted[0], beneficial: false };

  const self = SELF_CONDITION.exec(raw)?.[1]?.toLowerCase();

  if (self && isCondition(self)) return { condition: self, beneficial: true };

  if (hasSave && IMMOBILIZING.test(text)) return { condition: "immobilized", beneficial: false };

  const target = hasSave ? TARGET_CONDITION.exec(raw)?.[1]?.toLowerCase() : undefined;

  return { condition: target && isCondition(target) ? target : null, beneficial: false };
}

function shape(text: string, cast: SpellCast): Pick<SpellFacts, "shape_type" | "shape_size"> {
  if (cast.facts.shape_type) return { shape_type: cast.facts.shape_type, shape_size: cast.facts.shape_size };

  const m = SHAPE_TEXT.exec(text);

  if (!m) return { shape_type: null, shape_size: null };

  if (m[2]) return { shape_type: m[2].toLowerCase() === "cylinder" ? "sphere" : m[2].toLowerCase(), shape_size: Number(m[1]) };

  return { shape_type: "line", shape_size: Number(m[3] ?? m[4] ?? m[5]) };
}

export function deriveSpell(row: Record<string, unknown>, text: string, higher: string, cast: SpellCast, t: Translator): SpellDerivation {
  const raw = JSON.stringify(row.entries ?? []);

  const misc = strings(row.miscTags);

  const damageTypes = strings(row.damageInflict);

  const ability = strings(row.savingThrow).find((a) => (ABILITY_KEYS as readonly string[]).includes(a)) ?? null;

  const spellAttack = array(row.spellAttack).length > 0;

  let moveTrigger = false;

  const triggerText = text.replace(/[^.]*repeat the saving throw[^.]*\./gi, "").replace(MOVE_TRIGGER, (clause) => {
    if (/damage|saving throw|\bcondition\b/i.test(clause)) return clause;

    moveTrigger = true;

    return "";
  });

  const unknownConditions = [...tags(raw, "condition"), ...strings(row.conditionInflict)].map((c) => c.toLowerCase()).filter((c) => !isCondition(c));

  const signals = damageTypes.length > 0 || ability !== null || spellAttack || strings(row.conditionInflict).length > 0 || ["damageImmune", "damageResist", "damageVulnerable", "conditionImmune"].some((k) => array(row[k]).length > 0) || tags(raw, "damage").length > 0 || tags(raw, "condition").length > 0 || SIGNAL_TEXT.test(text);

  const narrative = (narrativeReason: NarrativeReason): SpellDerivation => ({ native: { fields: { targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: [] }, narrative: true, narrativeReason, riders: [] } });

  const rowCombat = damageTypes.length > 0 || spellAttack || strings(row.conditionInflict).length > 0 || ["damageImmune", "damageResist", "damageVulnerable", "conditionImmune"].some((k) => array(row[k]).length > 0);

  const hasSignals = (t: string, r: string) => rowCombat || ability !== null || tags(r, "damage").length > 0 || tags(r, "condition").length > 0 || SIGNAL_TEXT.test(t);

  if (!rowCombat && isOutOfCombatBuff(cast, text)) return narrative("outOfCombat");

  if (signals && !hasSignals(withoutRestOrTravel(text), raw)) return narrative("outOfCombat");

  if (signals && !hasSignals(text, withoutObjectConditions(raw))) return narrative("objectOnly");

  if (!signals && createsPlainObject(misc, text, raw)) return narrative("createdObject");

  if (misc.includes("SMN")) return { blocker: "SUMMON" };

  if (BUFF.test(text) || ["damageImmune", "damageResist", "damageVulnerable"].some((k) => array(row[k]).length > 0)) return { blocker: "BUFF_OR_TRANSFORM" };

  if (signals && ZONE.test(triggerText)) return { blocker: "ZONE_OR_TRIGGER" };

  if (WEAPON.test(text)) return { blocker: "WEAPON" };

  if (!signals) return narrative("noCombatNumbers");

  if (unknownConditions.length > 0) return { blocker: "UNSUPPORTED_CONDITION", detail: { condition: unknownConditions[0] } };

  if (SELF_DAMAGE.test(text)) return { blocker: "SELF_DAMAGE" };

  const slowed = SLOWED.exec(text);

  if (slowed && damageTypes.length === 0 && !ability && !spellAttack) {
    const range = spellRange(cast.facts);

    return { native: { narrative: false, riders: [], fields: { targeting: { kind: "enemy", ...(range !== "self" && { range }) }, resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: -Number(slowed[1]), duration: { rounds: durationRounds(cast.facts.duration) } }] } } };
  }

  const sped = SPEED_UP.exec(text);

  if (sped && damageTypes.length === 0 && !ability && !spellAttack && !CHOICE.test(text)) {
    const withSelf = SELF_AND_OTHERS.exec(text);

    const upTo = UP_TO_CREATURES.exec(text);

    const count = withSelf ? (numberWord(withSelf[1]) ?? 0) + 1 : upTo ? numberWord(upTo[1]) : null;

    const facts: SpellFacts = { level: row.level as number, desc: text, higher_level: higher || null, ...cast.facts, shape_type: null, shape_size: null, saving_throw_ability: null, damage_roll: null, damage_types: [], target_count: count };

    const riders = RIDERS.filter(([re, id]) => id !== "speed" && re.test(text)).map(([, id]) => t(`derived.rider.${id}`));

    if (moveTrigger) riders.push(t("derived.rider.reaction"));

    return { native: { narrative: false, riders, fields: { targeting: spellTargeting(facts, "ally"), resolution: { kind: "auto" }, dice: 0, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: Number(sped[1]), duration: { rounds: durationRounds(cast.facts.duration) } }], ...spellUpcast(facts, "none") } } };
  }

  const damageDice = tags(raw, "damage");

  const diceTags = tags(raw, "dice");

  const roll = REST.test(text) && damageTypes.length === 0 ? null : damageDice.length === 1 ? damageDice[0] : damageDice.length === 0 && diceTags.length === 1 ? diceTags[0] : null;

  if (VARIABLE.test(text) || (damageTypes.length > 0 && damageDice.length > 1)) return { blocker: "VARIABLE_DAMAGE" };

  const { condition, beneficial } = conditionOf(row, raw, text, ability !== null);

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

  const riders = RIDERS.filter(([re]) => re.test(text)).map(([, id]) => t(`derived.rider.${id}`));

  if (applied === "immobilized") riders.push(t("derived.rider.hold"));

  const otherConditions = tags(raw, "condition").filter((c) => c.toLowerCase() !== applied);

  if (otherConditions.length > 0) riders.push(t("derived.rider.conditions", { list: otherConditions.join(", ") }));

  return {
    native: {
      narrative: false,
      riders,
      fields: {
        targeting,
        resolution: spellResolution(facts, kind, targeting),
        spellEffects: spellEffects(facts, kind),
        dice: dice?.count ?? 0,
        ...(dice && { dieSides: dice.sides }),
        ...spellUpcast(facts, kind),
        ...(kind === "heal" && ADDS_MOD.test(text) && { addAbilityMod: true }),
      },
    },
  };
}
