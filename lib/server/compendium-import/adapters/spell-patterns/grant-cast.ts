import type { SpellRecognizer } from "./index";

import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { InlineCast } from "@/lib/utils/spells/model/schema";

const USE = /\b(you|(?:a|the) (?:creature|target|ally)[^.]{0,30}?)\s+(?:can|may)\s+(?:use|take)\s+(?:a|an|your|its|their)\s+(bonus action|action|reaction)\b/i;

const ATTACK = /\bmake an? (melee|ranged) (?:spell attack|weapon attack[^.]{0,40}\. This attack uses your spell attack bonus)/i;

const DAMAGE = /(\d+)d(4|6|8|10|12|20)\b(?:\s*\+\s*(your [a-z ]*modifier|its [a-z ]*modifier))?[^.]{0,20}?\b([a-z]+) damage/i;

const DAMAGE_EQUAL = /\b([a-z]+) damage equal to (\d+)d(4|6|8|10|12|20)\b(?:\s*\+\s*(your [a-z ]*modifier|its [a-z ]*modifier))?/i;

const WITHIN = /\bwithin (\d+) feet\b/i;

const COSTS = { "bonus action": "bonusAction", action: "action", reaction: "reaction" } as const;

export const grantSpellAttack: SpellRecognizer = ({ t, text, cast, ability, damageTypes }) => {
  const use = USE.exec(text);

  if (!use || ability) return null;

  const after = text.slice(use.index + use[0].length);

  const attack = ATTACK.exec(after);

  if (!attack || attack.index > 160) return null;

  const rest = after.slice(attack.index + attack[0].length);

  const equal = DAMAGE_EQUAL.exec(rest);

  const dmg = DAMAGE.exec(rest);

  const [count, sides, mod, type] = equal ? [equal[2], equal[3], equal[4], equal[1]] : dmg ? [dmg[1], dmg[2], dmg[3], dmg[4]] : [];

  const damageType = damageTypes[0] ?? type?.toLowerCase();

  if (!count || !sides || !damageType) return null;

  const melee = attack[1].toLowerCase() === "melee";

  const range = WITHIN.exec(rest)?.[1];

  const owner = /^you$/i.test(use[1]);

  const hostRange = spellRange(cast.facts);

  const inline: InlineCast = {
    targeting: { kind: "enemy", ...(melee ? { range: 5 } : range && { range: Math.min(600, Math.max(5, Number(range))) }) },
    resolution: { kind: "attack" },
    dice: Number(count),
    dieSides: Number(sides) as InlineCast["dieSides"],
    ...(mod && { addAbilityMod: true }),
    effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType }],
  };

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: owner || hostRange === "self" ? { kind: "self" } : { kind: "ally", range: hostRange },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "grantCast", label: t("derived.spell.label.spellAttack"), cost: COSTS[use[2].toLowerCase() as keyof typeof COSTS], duration: { rounds: durationRounds(cast.facts.duration) }, ...(!owner && { target: "eventTarget" }), cast: inline }],
      },
    },
  };
};

const WEAPON_OBJECT = /\ba creature can use (?:the|a|an) [a-z' -]{1,40}? as an? (melee|ranged) weapon\b/i;

const WEAPON_DAMAGE = /\bdeals? (\d+)d(4|6|8|10|12|20) ([a-z]+) damage on a hit\b(?:[^.]{0,20}?\badding your [a-z ]*modifier)?/i;

const BITE_HEAL = /\b(?:heals?|healing)\b[^.]{0,60}\bhit points\b/i;

export const grantWeaponObject: SpellRecognizer = ({ t, text, cast, ability }) => {
  const weapon = WEAPON_OBJECT.exec(text);

  const dmg = weapon && WEAPON_DAMAGE.exec(text.slice(weapon.index));

  const range = spellRange(cast.facts);

  if (!weapon || !dmg || ability || range === "self") return null;

  const melee = weapon[1].toLowerCase() === "melee";

  const inline: InlineCast = {
    targeting: { kind: "enemy", ...(melee && { range: 5 }) },
    resolution: { kind: "attack" },
    dice: Number(dmg[1]),
    dieSides: Number(dmg[2]) as InlineCast["dieSides"],
    ...(/adding your [a-z ]*modifier/i.test(dmg[0]) && { addAbilityMod: true }),
    effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: dmg[3].toLowerCase() }],
  };

  return {
    native: {
      narrative: false,
      riders: BITE_HEAL.test(text) ? ["bite heal"] : [],
      fields: {
        targeting: { kind: "ally", range },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "grantCast", label: t("derived.spell.label.objectStrike"), cost: "action", duration: { rounds: durationRounds(cast.facts.duration) }, target: "eventTarget", cast: inline }],
      },
    },
  };
};
