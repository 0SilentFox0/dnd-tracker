import type { SpellRecognizer } from "./index";

import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { InlineCast, SpellEffect } from "@/lib/utils/spells/model/schema";

const ATTACKED = /\bwhen a creature (?:within (\d+) feet of the target )?makes an? (?:attack|attack roll) against the target,\s*you can use your reaction to\b/i;

const DAMAGED = /\b(?:if|when) the target takes damage from a hostile creature[^,.]{0,40},\s*you can use your reaction to make an? (?:melee|ranged) spell attack\b/i;

const WITHIN = /\bwithin (\d+) feet of the target\b/i;

const DAMAGE = /(\d+)d(4|6|8|10|12|20)\s+([a-z]+) damage/i;

const HALF = /\bhalf as much damage\b/i;

export const MARK_ID = "reactionAnchor";

export const autoReactionSpell: SpellRecognizer = ({ text, cast, ability }) => {
  const attacked = ATTACKED.exec(text);

  const trigger = attacked ?? DAMAGED.exec(text);

  if (!trigger) return null;

  const rest = text.slice(trigger.index + trigger[0].length);

  const dmg = DAMAGE.exec(rest);

  if (!dmg) return null;

  const reach = attacked?.[1] ?? WITHIN.exec(`${trigger[0]} ${rest}`)?.[1];

  const range = spellRange(cast.facts);

  const rounds = durationRounds(cast.facts.duration);

  const inline: InlineCast = {
    targeting: { kind: "enemy", range: Math.min(600, Math.max(5, Number(reach ?? 60))) },
    resolution: !attacked ? { kind: "attack" } : ability ? { kind: "save", ability, onSuccess: HALF.test(text) ? "half" : "none" } : { kind: "auto" },
    dice: Number(dmg[1]),
    dieSides: Number(dmg[2]) as InlineCast["dieSides"],
    effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: dmg[3].toLowerCase() }],
    anchorMarkId: MARK_ID,
    auto: { on: attacked ? "attackAgainstMarked" : "damageToMarked" },
  };

  const spellEffects: SpellEffect[] = [
    { kind: "mark", markId: MARK_ID, duration: { rounds }, target: "eventTarget" },
    { kind: "grantCast", label: "Реакція", cost: "reaction", duration: { rounds }, cast: inline },
  ];

  return {
    native: {
      narrative: false,
      riders: [],
      fields: { targeting: range === "self" ? { kind: "self" } : { kind: "ally", range }, resolution: { kind: "auto" }, dice: 0, spellEffects },
    },
  };
};
