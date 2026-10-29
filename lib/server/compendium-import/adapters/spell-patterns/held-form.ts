import { grantSpellAttack } from "./grant-cast";
import type { SpellRecognizer } from "./index";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { Effect } from "@/lib/utils/abilities/schema";
import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

const TWO_SAVES = /\b(strength|dexterity|constitution|intelligence|wisdom|charisma) or (strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw\b/i;

const GRAPPLED_ESCAPE = /\bgrappled\b[^.]{0,60}\bescape DC (?:equals|is equal to) your spell save DC\b/i;

const START_TURN_DOT = /\btakes? (\d+d(?:4|6|8|10|12)) ([a-z]+) damage at the start of each of (?:its|their) turns\b/i;

const AC_AT_LEAST = /\bYour Armor Class becomes (?:at least (\d+)|(\d+) \(if it wasn't already higher\))/i;

const THRESHOLD = /\bdamage threshold of (\d+)\b/i;

const BLINDSIGHT = /\bblindsight (?:(?:out to|with a range of|of|a range of) )*(\d+) feet\b/i;

const ATTEMPTS_GRAPPLE = /\battempts? to grapple the target\b/i;

const ESCAPE_AS_NORMAL = /\bescape the grapple\b/i;

const SWIM_SPEED = /\bswimming speed of \d+ feet\b/i;

const abilityKey = (word: string) => ABILITY_KEYS.find((k) => k === word.toLowerCase()) as AbilityKey | undefined;

export const grapplingDot: SpellRecognizer = ({ text, cast, ability }) => {
  const dot = START_TURN_DOT.exec(text);

  const saved = !!ability && GRAPPLED_ESCAPE.test(text);

  const contested = !ability && ATTEMPTS_GRAPPLE.test(text) && ESCAPE_AS_NORMAL.test(text);

  if (!dot || (!saved && !contested)) return null;

  const range = spellRange(cast.facts);

  const pair = TWO_SAVES.exec(text);

  const first = pair ? abilityKey(pair[1]) : contested ? "strength" : undefined;

  const second = pair ? abilityKey(pair[2]) : contested ? "dexterity" : undefined;

  const rounds = durationRounds(cast.facts.duration);

  const effects: Effect[] = [
    { kind: "applyCondition", condition: "grappled", duration: { rounds }, escapeDc: true },
    { kind: "dot", damagePerRound: dot[1], damageType: dot[2].toLowerCase(), duration: { rounds }, linkedToCondition: true },
  ];

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: { kind: "enemy", ...(range !== "self" && { range }) },
        resolution: { kind: "save", ability: (first ?? ability) as AbilityKey, ...(first && second && { orAbility: second }), onSuccess: "none" },
        dice: 0,
        spellEffects: effects,
      },
    },
  };
};

export const armoredForm: SpellRecognizer = (input) => {
  const { text, cast, ability, damageTypes } = input;

  const ac = AC_AT_LEAST.exec(text);

  const threshold = THRESHOLD.exec(text);

  if ((!ac && !threshold) || ability) return null;

  const duration = { rounds: durationRounds(cast.facts.duration) };

  const blind = BLINDSIGHT.exec(text);

  const grant = damageTypes.length > 0 || /\bspell attack\b/i.test(text) ? grantSpellAttack(input) : null;

  const granted = grant && "native" in grant ? (grant.native.fields.spellEffects as SpellEffect[]) : [];

  if ((damageTypes.length > 0 || /\bspell attack\b/i.test(text)) && granted.length === 0) return null;

  const effects: SpellEffect[] = [
    ...(ac ? [{ kind: "modifyStat", stat: "armor", atLeast: Number(ac[1] ?? ac[2]), duration } as const] : []),
    ...(blind ? [{ kind: "flag", flag: "sense", sense: "blindsight", range: Number(blind[1]), duration } as const] : []),
    ...(threshold ? [{ kind: "flag", flag: "damageThreshold", value: Number(threshold[1]), duration } as const] : []),
    ...granted,
  ];

  return { native: { narrative: false, riders: SWIM_SPEED.test(text) ? ["swimming speed"] : [], fields: { targeting: { kind: "self" }, resolution: { kind: "auto" }, dice: 0, spellEffects: effects } } };
};
